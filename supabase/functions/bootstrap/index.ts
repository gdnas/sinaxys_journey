import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

type BootstrapBody = {
  confirm: string;
};

const CONFIRM_PHRASE = "RESET_SINAXYS_JOURNEY";

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function baseDepartments() {
  return ["Financeiro", "Suporte", "Customer Success", "Comercial", "Marketing", "Produto"];
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json(405, { error: "Method not allowed" });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      console.error("[bootstrap] missing env", { hasUrl: !!SUPABASE_URL, hasKey: !!SUPABASE_SERVICE_ROLE_KEY });
      return json(500, { error: "Missing server configuration" });
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    const body = (await req.json().catch(() => null)) as BootstrapBody | null;
    if (!body || body.confirm !== CONFIRM_PHRASE) {
      return json(400, { error: `Confirmação inválida. Use confirm="${CONFIRM_PHRASE}".` });
    }

    const authHeader = req.headers.get("Authorization") ?? "";
    const token = authHeader.toLowerCase().startsWith("bearer ") ? authHeader.slice(7) : "";

    // Allow unauthenticated bootstrap ONLY when there are no auth users.
    const { data: usersPage, error: listErr } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1 });
    if (listErr) {
      console.error("[bootstrap] listUsers error", { message: listErr.message });
      return json(500, { error: "Could not verify existing users" });
    }

    const hasAnyUsers = (usersPage?.users?.length ?? 0) > 0;

    if (hasAnyUsers) {
      if (!token) return json(401, { error: "Unauthorized" });

      const { data: callerData, error: callerErr } = await supabase.auth.getUser(token);
      if (callerErr || !callerData?.user) {
        console.error("[bootstrap] invalid token", { message: callerErr?.message });
        return json(401, { error: "Unauthorized" });
      }

      const callerId = callerData.user.id;
      const { data: callerProfile, error: profErr } = await supabase
        .from("profiles")
        .select("id, role")
        .eq("id", callerId)
        .maybeSingle();

      if (profErr) {
        console.error("[bootstrap] profile lookup error", { message: profErr.message });
        return json(500, { error: "Could not validate permissions" });
      }

      if (callerProfile?.role !== "MASTERADMIN") {
        return json(403, { error: "Forbidden" });
      }
    }

    console.log("[bootstrap] starting reset", { hasAnyUsers });

    // 1) Delete app tables
    await supabase.from("profiles").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("departments").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    await supabase.from("companies").delete().neq("id", "00000000-0000-0000-0000-000000000000");

    // 2) Delete all auth users
    // List and delete in pages
    let page = 1;
    const perPage = 200;
    let deletedAuth = 0;

    while (true) {
      const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
      if (error) {
        console.error("[bootstrap] listUsers paging error", { message: error.message, page });
        return json(500, { error: "Could not list users" });
      }
      const users = data?.users ?? [];
      if (!users.length) break;

      for (const u of users) {
        const { error: delErr } = await supabase.auth.admin.deleteUser(u.id);
        if (delErr) {
          console.error("[bootstrap] deleteUser error", { message: delErr.message, userId: u.id });
          return json(500, { error: "Could not delete users" });
        }
        deletedAuth += 1;
      }

      // If we got a full page, there might be more.
      if (users.length < perPage) break;
      page += 1;
    }

    // 3) Create company
    const { data: company, error: cErr } = await supabase
      .from("companies")
      .insert({
        name: "Sinaxys Journey",
        tagline: "Aprendizado com clareza. Evolução com propósito.",
        colors: { ink: "#20105B", primary: "#542AEF", bg: "#F6F4FF", tint: "#EFEAFF", border: "#E6E1FF" },
      })
      .select("id")
      .single();

    if (cErr || !company) {
      console.error("[bootstrap] create company error", { message: cErr?.message });
      return json(500, { error: "Could not create company" });
    }

    // 4) Departments
    const deps = baseDepartments().map((name) => ({ company_id: company.id, name }));
    const { error: dErr } = await supabase.from("departments").insert(deps);
    if (dErr) {
      console.error("[bootstrap] create departments error", { message: dErr.message });
      return json(500, { error: "Could not create departments" });
    }

    // 5) Create masteradmin + admin
    const masterEmail = "guilhermenastrini@gmail.com";
    const masterPassword = "Med1-01875";
    const adminEmail = "guilherme@sinaxys.com";
    const adminPassword = "Sinaxys@123";

    const { data: masterUser, error: muErr } = await supabase.auth.admin.createUser({
      email: masterEmail,
      password: masterPassword,
      email_confirm: true,
      user_metadata: { name: "Guilherme Nastrini" },
    });
    if (muErr || !masterUser?.user) {
      console.error("[bootstrap] create master user error", { message: muErr?.message });
      return json(500, { error: "Could not create master user" });
    }

    const { data: adminUser, error: auErr } = await supabase.auth.admin.createUser({
      email: adminEmail,
      password: adminPassword,
      email_confirm: true,
      user_metadata: { name: "Guilherme" },
    });
    if (auErr || !adminUser?.user) {
      console.error("[bootstrap] create admin user error", { message: auErr?.message });
      return json(500, { error: "Could not create admin user" });
    }

    const { error: pErr } = await supabase.from("profiles").insert([
      {
        id: masterUser.user.id,
        email: masterEmail.toLowerCase(),
        name: "Guilherme Nastrini",
        role: "MASTERADMIN",
        company_id: null,
        active: true,
        must_change_password: false,
      },
      {
        id: adminUser.user.id,
        email: adminEmail.toLowerCase(),
        name: "Guilherme",
        role: "ADMIN",
        company_id: company.id,
        active: true,
        must_change_password: false,
      },
    ]);

    if (pErr) {
      console.error("[bootstrap] create profiles error", { message: pErr.message });
      return json(500, { error: "Could not create profiles" });
    }

    console.log("[bootstrap] done", { companyId: company.id, deletedAuth });

    return json(200, {
      ok: true,
      companyId: company.id,
      users: [
        { email: masterEmail, role: "MASTERADMIN" },
        { email: adminEmail, role: "ADMIN" },
      ],
    });
  } catch (e) {
    console.error("[bootstrap] unexpected error", { message: e instanceof Error ? e.message : String(e) });
    return json(500, { error: "Internal error" });
  }
});
