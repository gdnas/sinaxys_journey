import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

const functionName = "teams-health";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const required = [
      "TEAMS_CLIENT_ID",
      "TEAMS_CLIENT_SECRET",
      "TEAMS_OAUTH_STATE_SECRET",
      "TEAMS_TOKEN_ENC_KEY",
      "APP_BASE_URL",
      "SUPABASE_URL",
    ] as const;

    const missing: string[] = [];
    const configured: Record<string, boolean> = {};

    for (const s of required) {
      const v = Deno.env.get(s);
      const isSet = !!(v && v.trim());
      configured[s] = isSet;
      if (!isSet) missing.push(s);
    }

    const ok = missing.length === 0;

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")?.trim() ?? "";
    const redirectUri = `${SUPABASE_URL}/functions/v1/teams-callback`;

    // Extract tenant ID from client ID (format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)
    const clientId = Deno.env.get("TEAMS_CLIENT_ID")?.trim() ?? "";
    const tenantId = clientId.match(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}/i)?.[0] ?? null;

    console.log(`[${functionName}] health check`, { ok, missing: missing.length });

    return json(200, {
      ok,
      missing,
      configured,
      redirectUri,
      tenantId,
    });
  } catch (error) {
    console.error(`[${functionName}] unexpected`, { error: String(error) });
    return json(500, { ok: false, error: "unexpected", details: "Erro inesperado." });
  }
});