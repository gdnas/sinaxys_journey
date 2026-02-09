import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Body = {
  userId: string;
  tempPassword?: string | null;
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normalizeRole(raw: unknown) {
  return String(raw ?? "")
    .trim()
    .toUpperCase()
    .replace("COLABORADOR(A)", "COLABORADOR")
    .replace("COLABORADORA", "COLABORADOR")
    .replace("COLABORADOR/A", "COLABORADOR");
}

function generateTempPassword(len = 10) {
  // Simple, readable alphabet (avoid O/0, I/1).
  const alphabet = "ABCDEFGHJKMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  for (let i = 0; i < bytes.length; i++) {
    out += alphabet[bytes[i] % alphabet.length];
  }
  return out;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
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
      console.warn("[master-reset-password] invalid token", { authError: authError?.message });
      return json(401, { ok: false, message: "Unauthorized" });
    }

    const callerId = authData.user.id;

    const { data: callerProfile, error: callerErr } = await service
      .from("profiles")
      .select("id,role")
      .eq("id", callerId)
      .maybeSingle();

    if (callerErr) {
      console.error("[master-reset-password] failed to load caller profile", { callerErr: callerErr.message });
      return json(500, { ok: false, message: "Erro ao validar permissão." });
    }

    const callerRole = normalizeRole(callerProfile?.role);
    if (!callerProfile || callerRole !== "MASTERADMIN") {
      return json(403, { ok: false, message: "Sem permissão." });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    const userId = (body?.userId ?? "").trim();

    if (!userId) return json(400, { ok: false, message: "userId é obrigatório." });

    const requested = (body?.tempPassword ?? null)?.trim() || null;
    const tempPassword = requested ?? generateTempPassword(10);

    if (tempPassword.length < 6) {
      return json(400, { ok: false, message: "A senha temporária deve ter no mínimo 6 caracteres." });
    }

    const { error: updErr } = await service.auth.admin.updateUserById(userId, {
      password: tempPassword,
    });

    if (updErr) {
      console.error("[master-reset-password] updateUserById failed", { updErr: updErr.message, userId });
      return json(400, { ok: false, message: updErr.message });
    }

    const { error: profErr } = await service.from("profiles").update({ must_change_password: true }).eq("id", userId);
    if (profErr) {
      console.error("[master-reset-password] profiles update failed", { profErr: profErr.message, userId });
      return json(500, { ok: false, message: "Senha resetada, mas falhou ao marcar troca obrigatória." });
    }

    console.log("[master-reset-password] ok", { userId, generated: !requested });

    return json(200, { ok: true, userId, tempPassword });
  } catch (e) {
    console.error("[master-reset-password] unexpected error", { message: e instanceof Error ? e.message : String(e) });
    return json(500, { ok: false, message: "Erro inesperado." });
  }
});
