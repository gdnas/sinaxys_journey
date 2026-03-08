// @ts-nocheck - Suppress TS errors for Deno globals and external modules in this function

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
  return String(raw ?? "").trim().toUpperCase();
}

function makeTempPassword(length = 12) {
  // avoid ambiguous chars; keep it copy-friendly
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789!@#$%";
  let out = "";
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  for (let i = 0; i < bytes.length; i++) out += alphabet[bytes[i] % alphabet.length];
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

    // Access Deno.env - inline cast to avoid type errors
    const getEnv = (name: string) => (Deno as any).env.get(name) as string | undefined;
    const SUPABASE_URL = getEnv("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = getEnv("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = getEnv("SUPABASE_SERVICE_ROLE_KEY")!;

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
    // Allow both MASTERADMIN and ADMIN to reset passwords
    if (!callerProfile || (callerRole !== "MASTERADMIN" && callerRole !== "ADMIN")) {
      return json(403, { ok: false, message: "Sem permissão." });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    const userId = String(body?.userId ?? "").trim();
    if (!userId) return json(400, { ok: false, message: "userId é obrigatório." });

    const requested = (body?.tempPassword ?? null)?.trim() || null;
    const tempPassword = requested ?? makeTempPassword(12);
    if (tempPassword.length < 6) {
      return json(400, { ok: false, message: "A senha temporária deve ter no mínimo 6 caracteres." });
    }

    // Also confirms email, otherwise Supabase blocks login with "Email not confirmed".
    const { error: updErr } = await (service as any).auth.admin.updateUserById(userId, {
      password: tempPassword,
      email_confirm: true,
    });
    if (updErr) {
      console.error("[master-reset-password] updateUserById failed", { updErr: updErr.message, userId });
      return json(400, { ok: false, message: updErr.message });
    }

    const { error: profErr } = await service
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", userId);

    if (profErr) {
      console.error("[master-reset-password] failed to set must_change_password", { profErr: profErr.message, userId });
      return json(500, { ok: false, message: "Senha resetada, mas falhou ao marcar troca obrigatória." });
    }

    console.log("[master-reset-password] temp password created", { userId });

    return json(200, {
      ok: true,
      userId,
      tempPassword,
      mustChangePassword: true,
    });
  } catch (e) {
    console.error("[master-reset-password] unexpected error", { message: e instanceof Error ? e.message : String(e) });
    return json(500, { ok: false, message: "Erro inesperado." });
  }
});