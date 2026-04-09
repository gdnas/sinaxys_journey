import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const fn = "admin-set-offboarding";

type Body = {
  userId: string;
  scheduledAt?: string | null; // ISO timestamp (when user should be deactivated)
  keepCostUntil?: string | null; // optional: date until cost remains
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
      console.warn("[admin-set-offboarding] invalid token", { authError: authError?.message });
      return json(401, { ok: false, message: "Unauthorized" });
    }

    const callerId = authData.user.id;

    const { data: callerProfile, error: callerErr } = await service
      .from("profiles")
      .select("id,role,company_id")
      .eq("id", callerId)
      .maybeSingle();

    if (callerErr) {
      console.error("[admin-set-offboarding] failed to load caller profile", { callerErr: callerErr.message });
      return json(500, { ok: false, message: "Erro ao validar permissão." });
    }

    const callerRole = normalizeRole(callerProfile?.role);
    if (!callerProfile || (callerRole !== "MASTERADMIN" && callerRole !== "ADMIN")) {
      return json(403, { ok: false, message: "Sem permissão." });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    const userId = String(body?.userId ?? "").trim();
    if (!userId) return json(400, { ok: false, message: "userId é obrigatório." });

    const scheduledAt = body?.scheduledAt ? new Date(String(body.scheduledAt)) : null;
    if (scheduledAt && Number.isNaN(scheduledAt.getTime())) return json(400, { ok: false, message: "scheduledAt inválido." });

    // Load target profile to ensure same tenant when caller is not MASTERADMIN
    const { data: targetProfile, error: targetErr } = await service.from("profiles").select("id,company_id,active,monthly_cost_brl").eq("id", userId).maybeSingle();
    if (targetErr) {
      console.error("[admin-set-offboarding] failed to load target profile", { targetErr: targetErr.message, userId });
      return json(500, { ok: false, message: "Erro ao localizar usuário." });
    }
    if (!targetProfile) return json(404, { ok: false, message: "Usuário não encontrado." });

    if (callerRole !== "MASTERADMIN" && callerProfile.company_id !== targetProfile.company_id) {
      return json(403, { ok: false, message: "Sem permissão para alterar usuário de outra empresa." });
    }

    // Set offboarding state: set limited_access true, offboarding_state = 'PENDING', offboarding_scheduled_at = scheduledAt
    const { error: updErr } = await service
      .from("profiles")
      .update({ offboarding_state: "PENDING", offboarding_scheduled_at: scheduledAt, limited_access: true })
      .eq("id", userId);

    if (updErr) {
      console.error("[admin-set-offboarding] update failed", { updErr: updErr.message, userId });
      return json(500, { ok: false, message: "Falha ao agendar desligamento." });
    }

    console.log("[admin-set-offboarding] scheduled", { userId, scheduledAt });

    // If scheduledAt is null, the caller intended immediate processing: finalize now for this user
    if (!scheduledAt) {
      try {
        // Record compensation event if applicable
        if (targetProfile.monthly_cost_brl) {
          const { error: compErr } = await service.from("compensation_events").insert({
            company_id: targetProfile.company_id,
            user_id: targetProfile.id,
            monthly_cost_brl: targetProfile.monthly_cost_brl,
            effective_at: new Date().toISOString(),
            created_by: callerId,
          });
          if (compErr) console.warn("[admin-set-offboarding] failed to insert compensation event", { compErr: compErr.message, userId: targetProfile.id });
        }

        // Finalize offboarding immediately for this user
        const { error: finalizeErr } = await service
          .from("profiles")
          .update({ active: false, offboarding_state: "COMPLETED", limited_access: false })
          .eq("id", targetProfile.id);

        if (finalizeErr) {
          console.error("[admin-set-offboarding] finalize failed", { finalizeErr: finalizeErr.message, userId: targetProfile.id });
          // return partial success
          return json(200, { ok: true, userId, scheduledAt: null, message: "Agendado, mas falha ao finalizar imediatamente." });
        }

        console.log("[admin-set-offboarding] finalized immediately", { userId: targetProfile.id });
        return json(200, { ok: true, userId, scheduledAt: null, finalized: true });
      } catch (e) {
        console.error("[admin-set-offboarding] unexpected finalize error", { message: e instanceof Error ? e.message : String(e), userId });
        return json(500, { ok: false, message: "Agendado, mas erro ao finalizar imediatamente." });
      }
    }

    return json(200, { ok: true, userId, scheduledAt: scheduledAt ? scheduledAt.toISOString() : null });
  } catch (e) {
    console.error("[admin-set-offboarding] unexpected error", { message: e instanceof Error ? e.message : String(e) });
    return json(500, { ok: false, message: "Erro inesperado." });
  }
});