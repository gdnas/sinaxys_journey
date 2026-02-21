import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { verifyYouTubeOAuthState } from "../_shared/youtubeState.ts";
import { encryptToken } from "../_shared/youtubeCrypto.ts";

const functionName = "youtube-callback";

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
  if (!p.startsWith("/")) return "/videos";
  if (p.startsWith("//")) return "/videos";
  return p;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    const APP_BASE_URL = Deno.env.get("APP_BASE_URL")!;

    if (error) {
      console.warn(`[${functionName}] oauth error`, { error });
      return redirect(`${APP_BASE_URL}/videos?yt=error&reason=${encodeURIComponent(error)}`);
    }

    if (!code || !state) {
      return redirect(`${APP_BASE_URL}/videos?yt=error&reason=missing_code_or_state`);
    }

    const OAUTH_STATE_SECRET = Deno.env.get("YOUTUBE_OAUTH_STATE_SECRET")!;
    const GOOGLE_CLIENT_ID = Deno.env.get("YOUTUBE_GOOGLE_CLIENT_ID")!;
    const GOOGLE_CLIENT_SECRET = Deno.env.get("YOUTUBE_GOOGLE_CLIENT_SECRET")!;
    const TOKEN_ENC_KEY = Deno.env.get("YOUTUBE_TOKEN_ENC_KEY")!;

    const stateRes = await verifyYouTubeOAuthState(state, OAUTH_STATE_SECRET);
    if (!stateRes.ok) {
      console.warn(`[${functionName}] invalid state`, { message: stateRes.message });
      return redirect(`${APP_BASE_URL}/videos?yt=error&reason=${encodeURIComponent(stateRes.message)}`);
    }

    const { tenantId, userId, redirectTo } = stateRes.payload;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const redirectUri = `${SUPABASE_URL}/functions/v1/youtube-callback`;

    const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: redirectUri,
        grant_type: "authorization_code",
      }).toString(),
    });

    const tokenJson = await tokenRes.json().catch(() => null) as any;
    if (!tokenRes.ok) {
      console.error(`[${functionName}] token exchange failed`, { status: tokenRes.status, tokenJson });
      return redirect(`${APP_BASE_URL}/videos?yt=error&reason=token_exchange_failed`);
    }

    const refreshToken = String(tokenJson.refresh_token ?? "").trim();
    const accessToken = String(tokenJson.access_token ?? "").trim();
    const expiresIn = Number(tokenJson.expires_in ?? 0);

    if (!accessToken) {
      console.error(`[${functionName}] missing access_token`, { tokenJson });
      return redirect(`${APP_BASE_URL}/videos?yt=error&reason=missing_access_token`);
    }

    // NOTE: refresh_token may be omitted if user already granted consent. We keep existing encrypted refresh token.
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
      provider: "youtube",
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
      return redirect(`${APP_BASE_URL}/videos?yt=error&reason=save_failed`);
    }

    return redirect(`${APP_BASE_URL}${safePath(redirectTo)}?yt=connected`);
  } catch (e) {
    console.error(`[${functionName}] unexpected`, { error: String(e) });
    const APP_BASE_URL = Deno.env.get("APP_BASE_URL") ?? "";
    return redirect(`${APP_BASE_URL}/videos?yt=error&reason=unexpected`);
  }
});
