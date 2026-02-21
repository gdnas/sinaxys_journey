import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const functionName = "youtube-disconnect";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method !== "POST") return json(405, { ok: false, message: "Method not allowed" });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { ok: false, message: "Unauthorized" });

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return json(401, { ok: false, message: "Unauthorized" });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData?.user) {
      console.warn(`[${functionName}] invalid token`, { authError: authError?.message });
      return json(401, { ok: false, message: "Unauthorized" });
    }

    const userId = authData.user.id;

    const { data: profile, error: profErr } = await service
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .maybeSingle();

    if (profErr) {
      console.error(`[${functionName}] failed to load profile`, { error: profErr.message });
      return json(500, { ok: false, message: "Erro ao validar usuário." });
    }

    const tenantId = profile?.company_id ?? null;
    if (!tenantId) return json(400, { ok: false, message: "Usuário sem empresa vinculada." });

    const { error: updErr } = await service
      .from("user_video_integrations")
      .update({
        status: "revoked",
        refresh_token_enc: null,
        refresh_token_iv: null,
        access_token: null,
        access_token_expires_at: null,
        revoked_at: new Date().toISOString(),
      })
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .eq("provider", "youtube");

    if (updErr) {
      console.error(`[${functionName}] update failed`, { error: updErr.message });
      return json(500, { ok: false, message: "Não foi possível desconectar." });
    }

    return json(200, { ok: true });
  } catch (error) {
    console.error(`[${functionName}] unexpected`, { error: String(error) });
    return json(500, { ok: false, message: "Erro inesperado." });
  }
});
