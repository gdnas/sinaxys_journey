import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const functionName = "youtube-health";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function present(name: string) {
  const v = Deno.env.get(name);
  return !!(v && v.trim());
}

function parseProjectNumberFromOAuthClientId(clientId: string | null) {
  if (!clientId) return null;
  const trimmed = clientId.trim();
  const m = trimmed.match(/^(\d+)-/);
  return m?.[1] ?? null;
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method !== "GET" && req.method !== "POST") {
      return json(405, { ok: false, error: "method_not_allowed", details: "Method not allowed" });
    }

    const required = [
      "YOUTUBE_GOOGLE_CLIENT_ID",
      "YOUTUBE_GOOGLE_CLIENT_SECRET",
      "YOUTUBE_OAUTH_STATE_SECRET",
      "APP_BASE_URL",
      "YOUTUBE_TOKEN_ENC_KEY",
    ] as const;

    const missing = required.filter((k) => !present(k));
    const ok = missing.length === 0;

    // Helpful (non-secret) diagnostics
    const supabaseUrl = Deno.env.get("SUPABASE_URL")?.trim() ?? null;
    const redirectUri = supabaseUrl ? `${supabaseUrl}/functions/v1/youtube-callback` : null;

    const clientId = Deno.env.get("YOUTUBE_GOOGLE_CLIENT_ID")?.trim() ?? null;
    const oauthProjectNumber = parseProjectNumberFromOAuthClientId(clientId);
    const youtubeEnableUrl = oauthProjectNumber
      ? `https://console.developers.google.com/apis/api/youtube.googleapis.com/overview?project=${oauthProjectNumber}`
      : null;

    console.log(`[${functionName}] health check`, { ok, missingCount: missing.length, oauthProjectNumber });

    // IMPORTANT: return 200 even when not configured.
    // This keeps the UI "plug-and-play" by showing what's missing instead of throwing a non-2xx error.
    return json(200, {
      ok,
      provider: "youtube",
      missing,
      configured: required.reduce((acc, k) => ({ ...acc, [k]: present(k) }), {} as Record<string, boolean>),
      redirectUri,
      oauthProjectNumber,
      youtubeEnableUrl,
      // do NOT return clientId
    });
  } catch (e) {
    console.error(`[${functionName}] unexpected`, { error: String(e) });
    return json(500, { ok: false, error: "unexpected", details: "Erro inesperado." });
  }
});