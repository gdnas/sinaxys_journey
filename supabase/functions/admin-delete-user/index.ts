import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const fn = "admin-delete-user";

type Body = {
  userId: string;
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
      console.warn("[admin-delete-user] invalid token", { authError: authError?.message });
      return json(401, { ok: false, message: "Unauthorized" });
    }

    const callerId = authData.user.id;

    const { data: callerProfile, error: callerErr } = await service
      .from("profiles")
      .select("id,role,company_id")
      .eq("id", callerId)
      .maybeSingle();

    if (callerErr) {
      console.error("[admin-delete-user] failed to load caller profile", { callerErr: callerErr.message });
      return json(500, { ok: false, message: "Erro ao validar permissão." });
    }

    const callerRole = normalizeRole(callerProfile?.role);
    if (!callerProfile || (callerRole !== "MASTERADMIN" && callerRole !== "ADMIN")) {
      return json(403, { ok: false, message: "Sem permissão." });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    const userId = String(body?.userId ?? "").trim();
    if (!userId) return json(400, { ok: false, message: "userId é obrigatório." });

    // Load target profile to ensure same tenant when caller is not MASTERADMIN
    const { data: targetProfile, error: targetErr } = await service.from("profiles").select("id,company_id,email").eq("id", userId).maybeSingle();
    if (targetErr) {
      console.error("[admin-delete-user] failed to load target profile", { targetErr: targetErr.message, userId });
      return json(500, { ok: false, message: "Erro ao localizar usuário." });
    }
    if (!targetProfile) return json(404, { ok: false, message: "Usuário não encontrado." });

    if (callerRole !== "MASTERADMIN" && callerProfile.company_id !== targetProfile.company_id) {
      return json(403, { ok: false, message: "Sem permissão para deletar usuário de outra empresa." });
    }

    console.log("[admin-delete-user] deleting user", { userId, by: callerId });

    // Delete auth user
    try {
      // supabase-js admin deleteUser may return { error }
      const delRes = await service.auth.admin.deleteUser(userId);
      const delErr = (delRes as any)?.error;
      if (delErr) {
        console.error("[admin-delete-user] deleteUser failed", { delErr: delErr.message, userId });
        return json(400, { ok: false, message: delErr.message ?? "Falha ao deletar usuário do Auth." });
      }
    } catch (e) {
      console.error("[admin-delete-user] deleteUser unexpected error", { message: e instanceof Error ? e.message : String(e), userId });
      return json(500, { ok: false, message: "Falha ao deletar usuário do Auth." });
    }

    // Delete profiles record
    try {
      const { error: profErr } = await service.from("profiles").delete().eq("id", userId);
      if (profErr) {
        console.error("[admin-delete-user] failed to delete profile", { profErr: profErr.message, userId });
        // Not fatal: user auth already deleted. Return partial success message.
        return json(200, { ok: true, userId, partial: true, message: "Usuário removido do Auth, falha ao deletar profile." });
      }
    } catch (e) {
      console.error("[admin-delete-user] unexpected error deleting profile", { message: e instanceof Error ? e.message : String(e), userId });
      return json(200, { ok: true, userId, partial: true, message: "Usuário removido do Auth, falha ao deletar profile." });
    }

    console.log("[admin-delete-user] deleted", { userId });
    return json(200, { ok: true, userId });
  } catch (e) {
    console.error("[admin-delete-user] unexpected error", { message: e instanceof Error ? e.message : String(e) });
    return json(500, { ok: false, message: "Erro inesperado." });
  }
});
