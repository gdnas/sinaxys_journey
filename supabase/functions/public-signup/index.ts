import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const functionName = "public-signup";

type Payload = {
  email: string;
  password: string;
  name: string;
  companyName: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    const body = (await req.json().catch(() => null)) as Payload | null;
    const email = String(body?.email ?? "").trim().toLowerCase();
    const password = String(body?.password ?? "");
    const name = String(body?.name ?? "").trim();
    const companyName = String(body?.companyName ?? "").trim();

    if (!email.includes("@")) {
      return new Response(JSON.stringify({ ok: false, message: "Informe um e-mail válido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (password.trim().length < 8) {
      return new Response(JSON.stringify({ ok: false, message: "A senha deve ter pelo menos 8 caracteres." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!name) {
      return new Response(JSON.stringify({ ok: false, message: "Informe seu nome." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!companyName) {
      return new Response(JSON.stringify({ ok: false, message: "Informe o nome da empresa." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Use signUp (anon) so Supabase sends the confirmation email using the configured SMTP + templates.
    const anon = createClient(supabaseUrl, anonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });

    const redirectTo = "https://kairoos.ai/login?confirmed=1";

    console.log(`[${functionName}] signing up user`, { email });
    const { data: signUpData, error: signUpErr } = await anon.auth.signUp({
      email,
      password,
      options: {
        data: { name, company_name: companyName },
        emailRedirectTo: redirectTo,
      },
    });

    if (signUpErr || !signUpData.user?.id) {
      console.error(`[${functionName}] signUp failed`, { error: signUpErr?.message });
      return new Response(JSON.stringify({ ok: false, message: signUpErr?.message ?? "Não foi possível criar sua conta." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = signUpData.user.id;

    // Use service role for provisioning tenant data.
    const admin = createClient(supabaseUrl, serviceKey);

    // Create tenant/company
    const kairoosColors = {
      ink: "#FFFFFF",
      primary: "#6D4CFF",
      bg: "#07071A",
      tint: "#12122A",
      border: "#24244A",
    };

    console.log(`[${functionName}] creating company`, { companyName });
    const { data: company, error: companyErr } = await admin
      .from("companies")
      .insert({
        name: companyName,
        tagline: "",
        colors: kairoosColors,
      })
      .select("id")
      .single();

    if (companyErr || !company?.id) {
      console.error(`[${functionName}] create company failed`, { error: companyErr?.message });
      // cleanup created auth user
      await admin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ ok: false, message: "Não foi possível criar sua empresa. Tente novamente." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`[${functionName}] creating profile`, { userId, companyId: company.id });
    const { error: profileErr } = await admin.from("profiles").insert({
      id: userId,
      email,
      name,
      role: "ADMIN",
      company_id: company.id,
      active: true,
      must_change_password: false,
    });

    if (profileErr) {
      console.error(`[${functionName}] create profile failed`, { error: profileErr.message });
      await admin.from("companies").delete().eq("id", company.id);
      await admin.auth.admin.deleteUser(userId);
      return new Response(JSON.stringify({ ok: false, message: "Não foi possível finalizar seu cadastro. Tente novamente." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure billing row exists
    await admin.from("company_billing").upsert(
      {
        company_id: company.id,
        plan_key: "FREE",
        status: "FREE",
      },
      { onConflict: "company_id" },
    );

    return new Response(JSON.stringify({ ok: true, needsEmailConfirmation: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[${functionName}] unexpected`, { error: String(error) });
    return new Response(JSON.stringify({ ok: false, message: "Erro inesperado." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});