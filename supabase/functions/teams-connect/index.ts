import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { signTeamsOAuthState } from "../_shared/teamsState.ts";

const functionName = "teams-connect";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function requireSecret(name: string) {
  const v = Deno.env.get(name);
  if (!v || !v.trim()) {
    return { ok: false as const, name };
  }
  return { ok: true as const, value: v.trim() };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method !== "POST") {
      return json(405, { ok: false, error: "method_not_allowed", details: "Method not allowed" });
    }

    // Validate required secrets early
    const required = [
      "TEAMS_CLIENT_ID",
      "TEAMS_CLIENT_SECRET",
      "TEAMS_OAUTH_STATE_SECRET",
      "APP_BASE_URL",
      "SUPABASE_URL",
      "SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
    ] as const;

    for (const s of required) {
      const r = requireSecret(s);
      if (!r.ok) {
        console.error(`[${functionName}] missing secret`, { name: r.name });
        // IMPORTANT: return 200 with ok:false so the client can show a friendly setup screen.
        return json(200, { ok: false, error: "config", details: `Missing secret: ${r.name}` });
      }
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

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!.trim();
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!.trim();
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!.trim();

    const TEAMS_CLIENT_ID = Deno.env.get("TEAMS_CLIENT_ID")!.trim();
    const OAUTH_STATE_SECRET = Deno.env.get("TEAMS_OAUTH_STATE_SECRET")!.trim();

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
      .select("id,company_id")
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

    const body = (await req.json().catch(() => null)) as { redirectTo?: string } | null;
    const redirectTo = String(body?.redirectTo ?? "/integrations");

    const redirectUri = `${SUPABASE_URL}/functions/v1/teams-callback`;

    const nonce = crypto.randomUUID();
    const state = await signTeamsOAuthState(
      {
        tenantId,
        userId,
        redirectTo,
        nonce,
        ts: Date.now(),
      },
      OAUTH_STATE_SECRET,
    );

    // Persist integration row (best-effort)
    const { error: upsertErr } = await service.from("user_video_integrations").upsert(
      {
        tenant_id: tenantId,
        user_id: userId,
        provider: "teams",
        status: "disconnected",
        revoked_at: null,
      },
      { onConflict: "tenant_id,user_id,provider" },
    );

    if (upsertErr) {
      console.error(`[${functionName}] failed to upsert integration row`, { error: upsertErr.message });
      return json(500, { ok: false, error: "db_upsert_failed", details: upsertErr.message });
    }

    // Microsoft Graph API OAuth 2.0 authorization endpoint
    const params = new URLSearchParams({
      client_id: TEAMS_CLIENT_ID,
      redirect_uri: redirectUri,
      response_type: "code",
      scope: "https://graph.microsoft.com/OnlineMeetings.Read https://graph.microsoft.com/ChannelMessage.Read.All https://graph.microsoft.com/User.Read",
      response_mode: "query",
      state,
      prompt: "consent",
    });

    const authUrl = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?${params.toString()}`;

    console.log(`[${functionName}] created oauth url`, { userId, tenantId, redirectUri });

    return json(200, { ok: true, authUrl });
  } catch (error) {
    console.error(`[${functionName}] unexpected`, { error: String(error) });
    return json(500, { ok: false, error: "unexpected", details: "Erro inesperado." });
  }
});