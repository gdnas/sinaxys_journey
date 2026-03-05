import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyTeamsOAuthState } from "../_shared/teamsState.ts";
import { encryptToken } from "../_shared/teamsCrypto.ts";

const functionName = "teams-callback";

function redirect(location: string) {
  return new Response(null, {
    status: 302,
    headers: {
      ...corsHeaders,
      Location: location,
    },
  });
}

function safePath(p: string) {
  // prevent open redirects: only allow relative paths
  if (!p.startsWith("/")) return "/integrations";
  if (p.startsWith("//")) return "/integrations";
  return p;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    const APP_BASE_URL = Deno.env.get("APP_BASE_URL")!;

    if (error) {
      console.warn(`[${functionName}] oauth error`, { error, errorDescription });
      const reason = encodeURIComponent(errorDescription || error);
      return redirect(`${APP_BASE_URL}/integrations?teams=error&reason=${reason}`);
    }

    if (!code || !state) {
      return redirect(`${APP_BASE_URL}/integrations?teams=error&reason=missing_code_or_state`);
    }

    const OAUTH_STATE_SECRET = Deno.env.get("TEAMS_OAUTH_STATE_SECRET")!;
    const TEAMS_CLIENT_ID = Deno.env.get("TEAMS_CLIENT_ID")!;
    const TEAMS_CLIENT_SECRET = Deno.env.get("TEAMS_CLIENT_SECRET")!;
    const TOKEN_ENC_KEY = Deno.env.get("TEAMS_TOKEN_ENC_KEY")!;

    const stateRes = await verifyTeamsOAuthState(state, OAUTH_STATE_SECRET);
    if (!stateRes.ok) {
      console.warn(`[${functionName}] invalid state`, { message: stateRes.message });
      return redirect(`${APP_BASE_URL}/integrations?teams=error&reason=${encodeURIComponent(stateRes.message)}`);
    }

    const { tenantId, userId, redirectTo } = stateRes.payload;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const redirectUri = `${SUPABASE_URL}/functions/v1/teams-callback`;

    // Exchange authorization code for tokens
    const tokenRes = await fetch("https://login.microsoftonline.com/common/oauth2/v2.0/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: TEAMS_CLIENT_ID,
        client_secret: TEAMS_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    const tokenJson = await tokenRes.json().catch(() => null) as any;
    if (!tokenRes.ok) {
      console.error(`[${functionName}] token exchange failed`, { status: tokenRes.status, tokenJson });
      return redirect(`${APP_BASE_URL}/integrations?teams=error&reason=token_exchange_failed`);
    }

    const refreshToken = String(tokenJson.refresh_token ?? "").trim();
    const accessToken = String(tokenJson.access_token ?? "").trim();
    const expiresIn = Number(tokenJson.expires_in ?? 0);

    if (!accessToken) {
      console.error(`[${functionName}] missing access_token`, { tokenJson });
      return redirect(`${APP_BASE_URL}/integrations?teams=error&reason=missing_access_token`);
    }

    // Encrypt refresh token
    let refresh_token_enc: string | null = null;
    let refresh_token_iv: string | null = null;

    if (refreshToken) {
      const enc = await encryptToken(refreshToken, TOKEN_ENC_KEY);
      refresh_token_enc = enc.cipherTextB64;
      refresh_token_iv = enc.ivB64;
    }

    const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;

    // Upsert integration
    const payload: any = {
      tenant_id: tenantId,
      user_id: userId,
      provider: "teams",
      status: "connected",
      revoked_at: null,
      access_token: accessToken,
      access_token_expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    };

    if (refresh_token_enc && refresh_token_iv) {
      payload.refresh_token_enc = refresh_token_enc;
      payload.refresh_token_iv = refresh_token_iv;
    }

    const { error: upsertErr } = await service
      .from("user_video_integrations")
      .upsert(payload, { onConflict: "tenant_id,user_id,provider" });

    if (upsertErr) {
      console.error(`[${functionName}] failed to upsert integration`, { error: upsertErr.message });
      return redirect(`${APP_BASE_URL}/integrations?teams=error&reason=save_failed`);
    }

    return redirect(`${APP_BASE_URL}${safePath(redirectTo)}?teams=connected`);
  } catch (e) {
    console.error(`[${functionName}] unexpected`, { error: String(e) });
    const APP_BASE_URL = Deno.env.get("APP_BASE_URL") ?? "";
    return redirect(`${APP_BASE_URL}/integrations?teams=error&reason=unexpected`);
  }
});