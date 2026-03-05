import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { decryptToken } from "../_shared/teamsCrypto.ts";

const functionName = "teams-resolve-recording";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    if (req.method !== "POST") return json(405, { ok: false, error: "method_not_allowed" });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { ok: false, error: "unauthorized" });
    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return json(401, { ok: false, error: "unauthorized" });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const TOKEN_ENC_KEY = Deno.env.get("TEAMS_TOKEN_ENC_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData?.user) return json(401, { ok: false, error: "unauthorized" });
    const userId = authData.user.id;

    const { data: profile, error: profErr } = await service
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .maybeSingle();
    if (profErr) return json(500, { ok: false, error: "profile_load_failed" });
    const tenantId = profile?.company_id ?? null;
    if (!tenantId) return json(400, { ok: false, error: "no_company" });

    const body = await req.json().catch(() => null);
    const url = String(body?.url ?? "").trim();
    if (!url) return json(400, { ok: false, error: "missing_url" });

    // Load integration tokens
    const { data: integration, error: intErr } = await service
      .from("user_video_integrations")
      .select("*")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .eq("provider", "teams")
      .maybeSingle();

    if (intErr || !integration) return json(400, { ok: false, error: "not_connected", details: "Microsoft Teams não está conectado." });
    if (integration.status !== "connected") return json(400, { ok: false, error: "not_connected", details: "Microsoft Teams não está conectado." });

    // refresh access token if needed (copied logic from teams-list-videos)
    let accessToken = integration.access_token;
    const expiresAt = integration.access_token_expires_at ? new Date(integration.access_token_expires_at) : null;
    const now = new Date();
    if (!accessToken || !expiresAt || expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
      if (!integration.refresh_token_enc || !integration.refresh_token_iv) return json(401, { ok: false, error: "token_expired" });
      try {
        const refreshToken = await decryptToken(integration.refresh_token_enc, integration.refresh_token_iv, TOKEN_ENC_KEY);
        const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams({ client_id: Deno.env.get("TEAMS_CLIENT_ID")!, client_secret: Deno.env.get("TEAMS_CLIENT_SECRET")!, refresh_token: refreshToken, grant_type: "refresh_token" }).toString(),
        });
        const tokenJson = await tokenRes.json().catch(() => null) as any;
        if (!tokenRes.ok || !tokenJson.access_token) {
          console.error(`[${functionName}] token refresh failed`, { status: tokenRes.status, tokenJson });
          return json(401, { ok: false, error: "token_refresh_failed" });
        }
        accessToken = tokenJson.access_token;
        const expiresIn = Number(tokenJson.expires_in ?? 3600);
        const newExpiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();
        const { error: updateErr } = await service
          .from("user_video_integrations")
          .update({ access_token: accessToken, access_token_expires_at: newExpiresAt, updated_at: new Date().toISOString() })
          .eq("tenant_id", tenantId)
          .eq("user_id", userId)
          .eq("provider", "teams");
        if (updateErr) console.error(`[${functionName}] failed to update access token`, { error: updateErr.message });
      } catch (e) {
        console.error(`[${functionName}] token refresh error`, { error: String(e) });
        return json(401, { ok: false, error: "token_refresh_failed" });
      }
    }

    // Convert sharing link to shareId with encoding per MS Graph docs
    function toShareId(sharedUrl: string) {
      // remove trailing slash
      const normalized = sharedUrl.replace(/\/$/, "");
      const base64 = btoa(normalized).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
      return `u!${base64}`;
    }

    const shareId = toShareId(url);
    const graphRes = await fetch(`https://graph.microsoft.com/v1.0/shares/${encodeURIComponent(shareId)}/driveItem`, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!graphRes.ok) {
      const text = await graphRes.text().catch(() => "");
      console.error(`[${functionName}] graph failed`, { status: graphRes.status, text });
      return json(500, { ok: false, error: "graph_failed", details: "Não foi possível resolver o link da gravação. Verifique permissões ou se o link é válido." });
    }

    const item = await graphRes.json() as any;
    const driveItemId = item.id;
    const title = item.name || null;
    const size = item.size ?? null;
    const webUrl = item.webUrl || null;

    // Upsert into video_assets
    const payload: any = {
      tenant_id: tenantId,
      user_id: userId,
      provider: 'teams',
      source_url: url,
      provider_item_id: driveItemId,
      title,
      metadata: { size, webUrl, raw: item },
      updated_at: new Date().toISOString(),
    };

    const { error: upsertErr } = await service.from('video_assets').upsert(payload, { onConflict: 'tenant_id,user_id,provider,provider_item_id' });
    if (upsertErr) {
      console.error(`[${functionName}] db upsert failed`, { error: upsertErr.message });
      return json(500, { ok: false, error: 'db_upsert_failed' });
    }

    return json(200, { ok: true, item: payload });
  } catch (error) {
    console.error(`[${functionName}] unexpected`, { error: String(error) });
    return json(500, { ok: false, error: "unexpected" });
  }
});
