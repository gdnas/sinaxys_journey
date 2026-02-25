import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const functionName = "okr-ensure-cycle";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Body = {
  type: "ANNUAL" | "QUARTERLY";
  year: number;
  quarter?: number | null;
  status?: "PLANNING" | "ACTIVE" | "CLOSED" | null;
  name?: string | null;
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { ok: false, message: "Unauthorized" });

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return json(401, { ok: false, message: "Unauthorized" });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const anon = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: authData, error: authError } = await anon.auth.getUser(token);
    if (authError || !authData?.user) {
      console.warn(`[${functionName}] invalid token`, { authError: authError?.message });
      return json(401, { ok: false, message: "Unauthorized" });
    }

    const callerId = authData.user.id;

    const { data: profile, error: profErr } = await service
      .from("profiles")
      .select("id,company_id,active")
      .eq("id", callerId)
      .maybeSingle();

    if (profErr) {
      console.error(`[${functionName}] failed to load caller profile`, { profErr: profErr.message });
      return json(500, { ok: false, message: "Erro ao validar usuário." });
    }

    if (!profile?.active || !profile.company_id) {
      return json(403, { ok: false, message: "Sem permissão." });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    const type = body?.type;
    const year = Number(body?.year);
    const quarter = body?.quarter ?? null;
    const status = (body?.status ?? "ACTIVE") as Body["status"];
    const name = (body?.name ?? null) || null;

    if (!(type === "ANNUAL" || type === "QUARTERLY")) {
      return json(400, { ok: false, message: "Tipo de ciclo inválido." });
    }

    if (!Number.isFinite(year) || year < 2000 || year > 2100) {
      return json(400, { ok: false, message: "Ano inválido." });
    }

    if (type === "QUARTERLY") {
      const q = Number(quarter);
      if (!Number.isFinite(q) || q < 1 || q > 4) {
        return json(400, { ok: false, message: "Trimestre inválido." });
      }
    }

    const qKey = type === "QUARTERLY" ? Number(quarter) : null;

    // IMPORTANT: PostgREST does not accept `eq(null)` for integer columns.
    // Use `.is("quarter", null)` for annual cycles.
    let q = service
      .from("okr_cycles")
      .select("id,company_id,type,year,quarter,start_date,end_date,status,name,created_at,updated_at")
      .eq("company_id", profile.company_id)
      .eq("type", type)
      .eq("year", year);

    q = type === "ANNUAL" ? q.is("quarter", null) : q.eq("quarter", qKey);

    const { data: existing, error: existingErr } = await q.maybeSingle();

    if (existingErr) {
      console.error(`[${functionName}] failed to check existing cycle`, { existingErr: existingErr.message });
      return json(500, { ok: false, message: "Erro ao validar ciclo." });
    }

    if (existing?.id) {
      console.log(`[${functionName}] cycle exists`, { companyId: profile.company_id, type, year, quarter: qKey, cycleId: existing.id });
      return json(200, { ok: true, cycle: existing });
    }

    const { data: created, error: createErr } = await service
      .from("okr_cycles")
      .insert({
        company_id: profile.company_id,
        type,
        year,
        quarter: qKey,
        start_date: null,
        end_date: null,
        status: status ?? "ACTIVE",
        name,
      })
      .select("id,company_id,type,year,quarter,start_date,end_date,status,name,created_at,updated_at")
      .single();

    if (createErr || !created?.id) {
      console.error(`[${functionName}] create failed`, { createErr: createErr?.message });
      return json(500, { ok: false, message: "Não foi possível criar o ciclo." });
    }

    console.log(`[${functionName}] created cycle`, { companyId: profile.company_id, type, year, quarter: qKey, cycleId: created.id });
    return json(200, { ok: true, cycle: created });
  } catch (e) {
    console.error(`[${functionName}] unexpected error`, { message: e instanceof Error ? e.message : String(e) });
    return json(500, { ok: false, message: "Erro inesperado." });
  }
});