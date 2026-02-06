import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

type Role = "MASTERADMIN" | "ADMIN" | "HEAD" | "COLABORADOR";

type ImportRow = {
  email: string;
  name: string;
  role: "ADMIN" | "HEAD" | "COLABORADOR";
  department?: string;
  managerEmail?: string;
  phone?: string;
  monthlyCostBRL?: number;
  contractUrl?: string;
  avatarUrl?: string;
  active?: boolean;
  initialPassword?: string;
  joinedAt?: string;
};

type Body = {
  companyId: string;
  rows: ImportRow[];
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function normEmail(email: string) {
  return String(email ?? "").trim().toLowerCase();
}

function randomPassword() {
  const a = crypto.randomUUID().slice(0, 8);
  const b = crypto.randomUUID().slice(0, 4);
  return `Sj-${a}-${b}`;
}

async function getCallerProfile(supabase: any, token: string) {
  const { data: callerData, error: callerErr } = await supabase.auth.getUser(token);
  if (callerErr || !callerData?.user) return { error: "Unauthorized" as const };

  const callerId = callerData.user.id;
  const { data: p, error: pErr } = await supabase
    .from("profiles")
    .select("id, role, company_id")
    .eq("id", callerId)
    .maybeSingle();

  if (pErr || !p) return { error: "Unauthorized" as const };
  return { profile: p as { id: string; role: Role; company_id: string | null } };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[import-users-bulk] missing env", { hasUrl: !!SUPABASE_URL, hasKey: !!SUPABASE_SERVICE_ROLE_KEY });
      return json(500, { error: "Missing server configuration" });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7) : "";
    if (!token) return json(401, { error: "Unauthorized" });

    const caller = await getCallerProfile(supabase, token);
    if ("error" in caller) return json(401, { error: "Unauthorized" });

    const body = (await req.json().catch(() => null)) as Body | null;
    if (!body || !body.companyId || !Array.isArray(body.rows)) return json(400, { error: "Invalid body" });

    const companyId = body.companyId;

    const canManage =
      caller.profile.role === "MASTERADMIN" ||
      (caller.profile.role === "ADMIN" && caller.profile.company_id === companyId);

    if (!canManage) return json(403, { error: "Forbidden" });

    let created = 0;
    let updated = 0;
    let managersLinked = 0;
    const generatedPasswords: Array<{ email: string; password: string }> = [];

    // Build dept lookup
    const { data: existingDepts } = await supabase
      .from("departments")
      .select("id, name")
      .eq("company_id", companyId);

    const deptByName = new Map<string, string>();
    for (const d of existingDepts ?? []) deptByName.set(String(d.name).trim().toLowerCase(), d.id);

    const ensureDeptId = async (name: string) => {
      const key = name.trim().toLowerCase();
      const existing = deptByName.get(key);
      if (existing) return existing;

      const { data, error } = await supabase
        .from("departments")
        .insert({ company_id: companyId, name: name.trim() })
        .select("id, name")
        .single();

      if (error || !data) {
        console.error("[import-users-bulk] create dept error", { message: error?.message, name });
        throw new Error(`Não foi possível criar o departamento: ${name}`);
      }
      deptByName.set(String(data.name).trim().toLowerCase(), data.id);
      return data.id as string;
    };

    // First pass: create/update users (without manager_id)
    const emailToUserId = new Map<string, string>();

    // Preload existing profiles in this company (and ADMIN/MASTERADMIN too)
    const { data: existingProfiles } = await supabase
      .from("profiles")
      .select("id, email, role, company_id")
      .or(`company_id.eq.${companyId},role.eq.MASTERADMIN`);

    for (const p of existingProfiles ?? []) {
      if (p?.email) emailToUserId.set(String(p.email).toLowerCase(), p.id);
    }

    for (const r of body.rows) {
      const email = normEmail(r.email);
      const name = String(r.name ?? "").trim();
      const role = r.role;

      if (!email.includes("@")) throw new Error(`E-mail inválido: ${r.email}`);
      if (!name) throw new Error(`Nome é obrigatório para ${email}`);
      if (role !== "ADMIN" && role !== "HEAD" && role !== "COLABORADOR") throw new Error(`Role inválido para ${email}`);

      let departmentId: string | null = null;
      if (role !== "ADMIN") {
        const depName = String(r.department ?? "").trim();
        if (!depName) throw new Error(`Departamento é obrigatório para ${email}.`);
        departmentId = await ensureDeptId(depName);
      }

      const requestedPassword = r.initialPassword?.trim();
      if (requestedPassword && requestedPassword.length < 6) throw new Error(`Senha inicial muito curta para ${email}.`);

      const existingId = emailToUserId.get(email) ?? null;

      // Create auth user if needed
      let userId = existingId;
      if (!userId) {
        const password = requestedPassword || randomPassword();
        const mustChange = true;

        const { data, error } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: { name },
        });

        if (error || !data?.user) {
          console.error("[import-users-bulk] createUser error", { message: error?.message, email });
          throw new Error(`Não foi possível criar o usuário ${email}: ${error?.message ?? "erro"}`);
        }

        userId = data.user.id;
        emailToUserId.set(email, userId);
        created += 1;

        if (!requestedPassword) generatedPasswords.push({ email, password });

        const { error: pErr } = await supabase.from("profiles").insert({
          id: userId,
          email,
          name,
          role,
          company_id: companyId,
          department_id: role === "ADMIN" ? null : departmentId,
          active: typeof r.active === "boolean" ? r.active : true,
          must_change_password: mustChange,
          avatar_url: r.avatarUrl?.trim() || null,
          phone: r.phone?.trim() || null,
          contract_url: r.contractUrl?.trim() || null,
          monthly_cost_brl: typeof r.monthlyCostBRL === "number" ? r.monthlyCostBRL : null,
          joined_at: r.joinedAt ?? null,
          manager_id: null,
        });

        if (pErr) {
          console.error("[import-users-bulk] insert profile error", { message: pErr.message, email });
          throw new Error(`Não foi possível salvar o perfil de ${email}.`);
        }
      } else {
        // Update existing profile
        const payload: Record<string, unknown> = {
          email,
          name,
          role,
          company_id: companyId,
          department_id: role === "ADMIN" ? null : departmentId,
          active: typeof r.active === "boolean" ? r.active : undefined,
          avatar_url: typeof r.avatarUrl === "string" ? r.avatarUrl.trim() || null : undefined,
          phone: typeof r.phone === "string" ? r.phone.trim() || null : undefined,
          contract_url: typeof r.contractUrl === "string" ? r.contractUrl.trim() || null : undefined,
          monthly_cost_brl: typeof r.monthlyCostBRL === "number" ? r.monthlyCostBRL : undefined,
          joined_at: typeof r.joinedAt === "string" ? r.joinedAt : undefined,
        };

        // Remove undefined keys
        Object.keys(payload).forEach((k) => payload[k] === undefined && delete payload[k]);

        const { error: upErr } = await supabase.from("profiles").update(payload).eq("id", userId);
        if (upErr) {
          console.error("[import-users-bulk] update profile error", { message: upErr.message, email });
          throw new Error(`Não foi possível atualizar ${email}.`);
        }

        if (requestedPassword) {
          const { error: pwErr } = await supabase.auth.admin.updateUserById(userId, { password: requestedPassword });
          if (pwErr) {
            console.error("[import-users-bulk] update password error", { message: pwErr.message, email });
            throw new Error(`Não foi possível atualizar a senha de ${email}.`);
          }
          await supabase.from("profiles").update({ must_change_password: true }).eq("id", userId);
        }

        updated += 1;
      }
    }

    // Second pass: link managers by email (skip for ADMIN)
    for (const r of body.rows) {
      const email = normEmail(r.email);
      const role = r.role;
      if (role === "ADMIN") continue;

      const managerEmail = normEmail(r.managerEmail ?? "");
      if (!managerEmail) continue;

      const userId = emailToUserId.get(email);
      const managerId = emailToUserId.get(managerEmail);
      if (!userId) continue;
      if (!managerId) throw new Error(`Gestor não encontrado para ${email}: ${managerEmail}`);
      if (userId === managerId) throw new Error(`Gestor inválido para ${email}: não pode ser ele mesmo.`);

      const { error } = await supabase.from("profiles").update({ manager_id: managerId }).eq("id", userId);
      if (error) {
        console.error("[import-users-bulk] manager link error", { message: error.message, email });
        throw new Error(`Não foi possível vincular gestor para ${email}.`);
      }
      managersLinked += 1;
    }

    console.log("[import-users-bulk] done", { created, updated, managersLinked, generatedPasswordsCount: generatedPasswords.length });

    return json(200, { created, updated, managersLinked, generatedPasswords });
  } catch (e) {
    console.error("[import-users-bulk] unexpected error", { message: e instanceof Error ? e.message : String(e) });
    return json(500, { error: e instanceof Error ? e.message : "Internal error" });
  }
});
