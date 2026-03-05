import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { decryptToken } from "../_shared/teamsCrypto.ts";

const functionName = "teams-list-videos";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method !== "POST") {
      return json(405, { ok: false, error: "method_not_allowed", details: "Method not allowed" });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.warn(`[${functionName}] missing authorization header`);
      return json(401, { ok: false, error: "unauthorized", details: "Missing Authorization header" });
    }

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) {
      console.warn(`[${functionName}] empty bearer token`);
      return json(401, { ok: false, error: "unauthorized", details: "Empty bearer token" });
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const TOKEN_ENC_KEY = Deno.env.get("TEAMS_TOKEN_ENC_KEY")!;
    const TEAMS_CLIENT_ID = Deno.env.get("TEAMS_CLIENT_ID")!;
    const TEAMS_CLIENT_SECRET = Deno.env.get("TEAMS_CLIENT_SECRET")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData?.user) {
      console.warn(`[${functionName}] invalid token`, { authError: authError?.message });
      return json(401, { ok: false, error: "unauthorized", details: "Invalid session" });
    }

    const userId = authData.user.id;

    const { data: profile, error: profErr } = await service
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .maybeSingle();

    if (profErr) {
      console.error(`[${functionName}] failed to load profile`, { error: profErr.message });
      return json(500, { ok: false, error: "profile_load_failed", details: profErr.message });
    }

    const tenantId = profile?.company_id ?? null;
    if (!tenantId) {
      console.warn(`[${functionName}] user without company`, { userId });
      return json(400, { ok: false, error: "no_company", details: "Usuário sem empresa vinculada." });
    }

    // Get integration record
    const { data: integration, error: intErr } = await service
      .from("user_video_integrations")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .eq("provider", "teams")
      .maybeSingle();

    if (intErr || !integration) {
      console.error(`[${functionName}] integration not found`, { error: intErr?.message });
      return json(404, { ok: false, error: "not_connected", details: "Microsoft Teams não está conectado." });
    }

    if (integration.status !== "connected") {
      return json(400, { ok: false, error: "not_connected", details: "Microsoft Teams não está conectado." });
    }

    // Check if access token is valid, otherwise refresh
    let accessToken = integration.access_token;
    const expiresAt = integration.access_token_expires_at ? new Date(integration.access_token_expires_at) : null;
    const now = new Date();

    // If token expires in less than 5 minutes, refresh it
    if (!accessToken || !expiresAt || expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
      if (!integration.refresh_token_enc || !integration.refresh_token_iv) {
        return json(401, { ok: false, error: "token_expired", details: "Sessão expirada. Conecte novamente." });
      }

      try {
        const refreshToken = await decryptToken(
          integration.refresh_token_enc,
          integration.refresh_token_iv,
          TOKEN_ENC_KEY,
        );

        const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({
            client_id: TEAMS_CLIENT_ID,
            client_secret: TEAMS_CLIENT_SECRET,
            refresh_token: refreshToken,
            grant_type: "refresh_token",
          }).toString(),
        });

        const tokenJson = await tokenRes.json().catch(() => null) as any;
        if (!tokenRes.ok || !tokenJson.access_token) {
          console.error(`[${functionName}] token refresh failed`, { status: tokenRes.status, tokenJson });
          return json(401, { ok: false, error: "token_refresh_failed", details: "Não foi possível renovar a sessão." });
        }

        accessToken = tokenJson.access_token;
        const expiresIn = Number(tokenJson.expires_in ?? 3600);
        const newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

        // Update access token in database
        const { error: updateErr } = await service
          .from("user_video_integrations")
          .update({
            access_token: accessToken,
            access_token_expires_at: newExpiresAt,
            updated_at: new Date().toISOString(),
          })
          .eq("tenant_id", tenantId)
          .eq("user_id", userId)
          .eq("provider", "teams");

        if (updateErr) {
          console.error(`[${functionName}] failed to update access token`, { error: updateErr.message });
        }
      } catch (e) {
        console.error(`[${functionName}] token refresh error`, { error: String(e) });
        return json(401, { ok: false, error: "token_refresh_failed", details: "Não foi possível renovar a sessão." });
      }
    }

    // Fetch online meetings with recordings from Microsoft Graph API
    // Note: This is a simplified approach. In production, you might need to:
    // 1. Use different endpoints based on where recordings are stored (SharePoint, OneDrive, Stream)
    // 2. Handle pagination
    // 3. Filter by date range

    const graphRes = await fetch(
      "https://graph.microsoft.com/v1.0/me/onlineMeetings?$filter=recordingsVideoUrl ne null&$orderby=startDateTime desc&$top=50",
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      },
    );

    if (!graphRes.ok) {
      const errorText = await graphRes.text();
      console.error(`[${functionName}] graph api error`, { status: graphRes.status, errorText });
      return json(500, { ok: false, error: "graph_api_failed", details: "Não foi possível buscar reuniões do Teams." });
    }

    const graphData = await graphRes.json() as any;
    const meetings = graphData.value || [];

    // Transform meetings to video format
    const videos = meetings.map((meeting: any) => {
      const startDateTime = meeting.startDateTime ? new Date(meeting.startDateTime) : null;
      const endDateTime = meeting.endDateTime ? new Date(meeting.endDateTime) : null;
      const durationMinutes = startDateTime && endDateTime
        ? Math.round((endDateTime.getTime() - startDateTime.getTime()) / 60000)
        : null;

      // Try to get embed URL from recordings
      // Note: The actual embed URL structure depends on where recordings are stored
      const embedUrl = meeting.recordingsVideoUrl || meeting.videoTeleconferenceUrl || null;

      return {
        id: meeting.id,
        title: meeting.subject || "Reunião sem título",
        date: startDateTime?.toISOString() || null,
        duration: durationMinutes,
        embedUrl: embedUrl,
        originalUrl: meeting.joinWebUrl || null,
      };
    });

    console.log(`[${functionName}] listed videos`, { count: videos.length, userId, tenantId });

    return json(200, { ok: true, videos });
  } catch (error) {
    console.error(`[${functionName}] unexpected`, { error: String(error) });
    return json(500, { ok: false, error: "unexpected", details: "Erro inesperado." });
  }
});