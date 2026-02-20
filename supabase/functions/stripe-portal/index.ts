import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const functionName = "stripe-portal";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supa = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    });
    const admin = createClient(supabaseUrl, serviceKey);

    const { data: userData } = await supa.auth.getUser();
    const uid = userData.user?.id ?? null;
    if (!uid) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile } = await admin.from("profiles").select("role,company_id").eq("id", uid).maybeSingle();
    if (!profile?.company_id) {
      return new Response(JSON.stringify({ error: "Perfil inválido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (String(profile.role).toUpperCase() !== "ADMIN") {
      return new Response(JSON.stringify({ error: "Apenas admins podem gerenciar." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const companyId = String(profile.company_id);

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      console.error(`[${functionName}] STRIPE_SECRET_KEY missing`);
      return new Response(JSON.stringify({ error: "Stripe não configurado." }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    const { data: billing } = await admin
      .from("company_billing")
      .select("stripe_customer_id")
      .eq("company_id", companyId)
      .maybeSingle();

    if (!billing?.stripe_customer_id) {
      return new Response(JSON.stringify({ error: "Assinatura não encontrada." }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const origin = req.headers.get("origin") ?? "https://kairoos.ai";

    console.log(`[${functionName}] creating portal session`, { companyId });
    const session = await stripe.billingPortal.sessions.create({
      customer: billing.stripe_customer_id,
      return_url: `${origin}/billing`,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[${functionName}] unexpected`, { error: String(error) });
    return new Response(JSON.stringify({ error: "Erro inesperado." }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
