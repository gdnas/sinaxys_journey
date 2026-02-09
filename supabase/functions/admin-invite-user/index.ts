import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Body = {
  email: string;
  name?: string | null;
  role?: "ADMIN" | "HEAD" | "COLABORADOR" | null;
  departmentId?: string | null;
  jobTitle?: string | null;
  phone?: string | null;
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
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
      console.warn("[admin-invite-user] invalid token", { authError: authError?.message });
      return json(401, { ok: false, message: "Unauthorized" });
    }

    const callerId = authData.user.id;

    const { data: callerProfile, error: callerErr } = await service
      .from("profiles")
      .select("id,role,company_id")
      .eq("id", callerId)
      .maybeSingle();

    if (callerErr) {
      console.error("[admin-invite-user] failed to load caller profile", { callerErr: callerErr.message });
      return json(500, { ok: false, message: "Erro ao validar permissão." });
    }

    if (!callerProfile || callerProfile.role !== "ADMIN" || !callerProfile.company_id) {
      return json(403, { ok: false, message: "Sem permissão." });
    }

    const body = (await req.json().catch(() => null)) as Body | null;
    const email = (body?.email ?? "").trim().toLowerCase();
    const name = (body?.name ?? "").trim() || null;
    const role = (body?.role ?? "COLABORADOR") ?? "COLABORADOR";
    const departmentId = (body?.departmentId ?? null) || null;
    const jobTitle = (body?.jobTitle ?? null) || null;
    const phone = (body?.phone ?? null) || null;

    if (!email || !email.includes("@")) {
      return json(400, { ok: false, message: "Informe um e-mail válido." });
    }

    if (!(["ADMIN", "HEAD", "COLABORADOR"] as const).includes(role)) {
      return json(400, { ok: false, message: "Papel inválido." });
    }

    // Avoid cross-company duplicates (same email in multiple tenants) — requires MASTERADMIN to resolve.
    const { data: existingProfiles, error: existingErr } = await service
      .from("profiles")
      .select("id,email,company_id")
      .eq("email", email);

    if (existingErr) {
      console.error("[admin-invite-user] failed to check existing profiles", { existingErr: existingErr.message });
      return json(500, { ok: false, message: "Erro ao validar e-mail." });
    }

    const sameCompany = (existingProfiles ?? []).find((p) => p.company_id === callerProfile.company_id);
    if (sameCompany) {
      return json(200, {
        ok: true,
        alreadyMember: true,
        profileId: sameCompany.id,
        email,
        message: "Este usuário já está cadastrado nesta empresa.",
      });
    }

    const otherCompany = (existingProfiles ?? []).find((p) => p.company_id && p.company_id !== callerProfile.company_id);
    if (otherCompany) {
      return json(409, {
        ok: false,
        message:
          "Este e-mail já existe em outra empresa. Para evitar duplicidade de tenant, peça ao MASTERADMIN para transferir/unificar o usuário.",
      });
    }

    const { data: inviteData, error: inviteErr } = await service.auth.admin.inviteUserByEmail(email);
    if (inviteErr || !inviteData?.user) {
      console.error("[admin-invite-user] invite failed", { inviteErr: inviteErr?.message });
      return json(400, { ok: false, message: inviteErr?.message ?? "Não foi possível convidar." });
    }

    const invitedUser = inviteData.user;

    const { error: upsertErr } = await service
      .from("profiles")
      .upsert(
        {
          id: invitedUser.id,
          email,
          name,
          role,
          company_id: callerProfile.company_id,
          department_id: departmentId,
          active: true,
          must_change_password: false,
          job_title: jobTitle,
          phone,
          joined_at: new Date().toISOString(),
        },
        { onConflict: "id" },
      );

    if (upsertErr) {
      console.error("[admin-invite-user] profile upsert failed", { upsertErr: upsertErr.message });
      return json(500, { ok: false, message: "Convite enviado, mas falhou ao criar profile." });
    }

    console.log("[admin-invite-user] invited", { email, userId: invitedUser.id, companyId: callerProfile.company_id });

    return json(200, {
      ok: true,
      invited: true,
      userId: invitedUser.id,
      email,
    });
  } catch (e) {
    console.error("[admin-invite-user] unexpected error", { message: e instanceof Error ? e.message : String(e) });
    return json(500, { ok: false, message: "Erro inesperado." });
  }
});
