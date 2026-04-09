import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const fn = "admin-finalize-offboarding";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Only service role will run this; no auth header expected for scheduled run.

    // Find all pending offboardings that are due OR have no scheduled date (process immediately)
    // We use an OR filter: offboarding_scheduled_at IS NULL OR offboarding_scheduled_at <= now()
    const nowIso = new Date().toISOString();
    const { data: due, error: dueErr } = await service
      .from("profiles")
      .select("id,company_id,monthly_cost_brl,offboarding_scheduled_at")
      .or(`offboarding_scheduled_at.is.null,offboarding_scheduled_at.lte.${nowIso}`)
      .eq("offboarding_state", "PENDING");

    if (dueErr) {
      console.error("[admin-finalize-offboarding] failed to query due offboardings", { dueErr: dueErr.message });
      return json(500, { ok: false, message: "Query error" });
    }

    let processed = 0;

    for (const p of due ?? []) {
      try {
        // Record compensation event ending now (to preserve cost until this date)
        if (p.monthly_cost_brl) {
          const { error: compErr } = await service.from("compensation_events").insert({
            company_id: p.company_id,
            user_id: p.id,
            monthly_cost_brl: p.monthly_cost_brl,
            effective_at: new Date().toISOString(),
            created_by: null,
          });
          if (compErr) console.warn("[admin-finalize-offboarding] failed to insert compensation event", { compErr: compErr.message, userId: p.id });
        }

        // Finalize offboarding: set active=false, offboarding_state='COMPLETED', limited_access=false
        const { error: updErr } = await service
          .from("profiles")
          .update({ active: false, offboarding_state: "COMPLETED", limited_access: false })
          .eq("id", p.id);

        if (updErr) {
          console.error("[admin-finalize-offboarding] failed to finalize profile", { updErr: updErr.message, userId: p.id });
        } else {
          processed++;
          // Audit log: record finalization
          try {
            await service.from("audit_logs").insert({
              company_id: p.company_id,
              actor_user_id: null,
              target_user_id: p.id,
              action: "offboarding_finalized",
              meta: { processed_at: new Date().toISOString() },
            });
          } catch (e) {
            console.warn("[admin-finalize-offboarding] audit log failed", { e: e instanceof Error ? e.message : String(e), userId: p.id });
          }
        }
      } catch (e) {
        console.error("[admin-finalize-offboarding] unexpected error", { error: String(e), userId: p.id });
      }
    }

    console.log("[admin-finalize-offboarding] processed", { count: processed });
    return json(200, { ok: true, processed });
  } catch (e) {
    console.error("[admin-finalize-offboarding] unexpected error", { message: e instanceof Error ? e.message : String(e) });
    return json(500, { ok: false, message: "Erro inesperado." });
  }
});