import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const functionName = "stripe-checkout";

type PlanKey = "PRO" | "BUSINESS";

type Payload = {
  planKey: PlanKey;
};

function getPriceId(planKey: PlanKey) {
  if (planKey === "PRO") return Deno.env.get("STRIPE_PRICE_PRO") ?? null;
  if (planKey === "BUSINESS") return Deno.env.get("STRIPE_PRICE_BUSINESS") ?? null;
  return null;
}

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

    const { data: userData, error: userErr } = await supa.auth.getUser();
    if (userErr || !userData.user) {
      console.error(`[${functionName}] getUser failed`, { error: userErr?.message });
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const uid = userData.user.id;

    const body = (await req.json().catch(() => null)) as Payload | null;
    const planKey = String(body?.planKey ?? "") as PlanKey;
    const priceId = getPriceId(planKey);

    if (!priceId) {
      return new Response(JSON.stringify({ error: "Plano inválido ou não configurado." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: profile, error: profileErr } = await admin
      .from("profiles")
      .select("id,email,role,company_id")
      .eq("id", uid)
      .maybeSingle();

    if (profileErr || !profile?.company_id) {
      console.error(`[${functionName}] profile fetch failed`, { error: profileErr?.message });
      return new Response(JSON.stringify({ error: "Perfil inválido." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (String(profile.role).toUpperCase() !== "ADMIN") {
      return new Response(JSON.stringify({ error: "Apenas admins podem assinar." }), {
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

    // Ensure billing row and customer
    const { data: billing } = await admin
      .from("company_billing")
      .select("company_id,stripe_customer_id")
      .eq("company_id", companyId)
      .maybeSingle();

    let customerId = billing?.stripe_customer_id ?? null;

    if (!customerId) {
      console.log(`[${functionName}] creating stripe customer`, { companyId });
      const customer = await stripe.customers.create({
        email: profile.email,
        metadata: { company_id: companyId },
      });
      customerId = customer.id;

      await admin.from("company_billing").upsert(
        {
          company_id: companyId,
          stripe_customer_id: customerId,
          plan_key: "FREE",
          status: "FREE",
        },
        { onConflict: "company_id" },
      );
    }

    const origin = req.headers.get("origin") ?? "https://kairoos.ai";

    console.log(`[${functionName}] creating checkout session`, { companyId, planKey });
    const session = await stripe.checkout.sessions.create({
      mode: "subscription",
      payment_method_types: ["card"],
      customer: customerId,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: `${origin}/billing?checkout=success`,
      cancel_url: `${origin}/pricing?checkout=cancel`,
      client_reference_id: companyId,
      metadata: { company_id: companyId, plan_key: planKey },
      allow_promotion_codes: true,
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
