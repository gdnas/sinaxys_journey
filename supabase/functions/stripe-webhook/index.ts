import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.25.0?target=denonext";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";

const functionName = "stripe-webhook";

type PlanKey = "FREE" | "PRO" | "BUSINESS";

function modulesForPlan(planKey: PlanKey) {
  if (planKey === "BUSINESS") {
    return ["OKR_ROI", "ORG", "COSTS", "TRACKS", "POINTS", "PDI_PERFORMANCE"] as const;
  }
  if (planKey === "PRO") {
    return ["OKR_ROI", "ORG", "COSTS"] as const;
  }
  return [] as const;
}

async function setPlan(admin: any, companyId: string, planKey: PlanKey, status: string, subscriptionId?: string | null, currentPeriodEnd?: string | null) {
  console.log(`[${functionName}] setPlan`, { companyId, planKey, status });

  await admin.from("company_billing").upsert(
    {
      company_id: companyId,
      plan_key: planKey,
      status,
      stripe_subscription_id: subscriptionId ?? null,
      current_period_end: currentPeriodEnd ?? null,
    },
    { onConflict: "company_id" },
  );

  // Enable/disable paid modules.
  const enableKeys = new Set(modulesForPlan(planKey));
  const allPaid = ["OKR_ROI", "ORG", "COSTS", "TRACKS", "POINTS", "PDI_PERFORMANCE"] as const;

  for (const k of allPaid) {
    const enabled = enableKeys.has(k);
    await admin.from("company_modules").upsert(
      {
        company_id: companyId,
        module_key: k,
        enabled,
      },
      { onConflict: "company_id,module_key" },
    );
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    if (!stripeKey || !webhookSecret) {
      console.error(`[${functionName}] missing stripe env vars`);
      return new Response("Stripe not configured", { status: 500, headers: corsHeaders });
    }

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      return new Response("Missing stripe-signature", { status: 400, headers: corsHeaders });
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2024-06-20" });

    const rawBody = await req.text();
    let event: Stripe.Event;
    try {
      event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
    } catch (err) {
      console.error(`[${functionName}] signature verification failed`, { error: String(err) });
      return new Response("Invalid signature", { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(supabaseUrl, serviceKey);

    console.log(`[${functionName}] event`, { type: event.type });

    if (event.type === "checkout.session.completed") {
      const session = event.data.object as Stripe.Checkout.Session;
      const companyId = String(session.metadata?.company_id ?? session.client_reference_id ?? "");
      const planKey = String(session.metadata?.plan_key ?? "PRO") as PlanKey;
      if (companyId) {
        const subscriptionId = typeof session.subscription === "string" ? session.subscription : session.subscription?.id ?? null;
        await setPlan(admin, companyId, planKey, "ACTIVE", subscriptionId, null);
      }
    }

    if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.created") {
      const sub = event.data.object as Stripe.Subscription;
      const companyId = String(sub.metadata?.company_id ?? "");
      const planKey = String(sub.metadata?.plan_key ?? "PRO") as PlanKey;
      if (companyId) {
        const currentPeriodEnd = sub.current_period_end ? new Date(sub.current_period_end * 1000).toISOString() : null;
        const status = String(sub.status).toUpperCase();
        await setPlan(admin, companyId, planKey, status, sub.id, currentPeriodEnd);
      }
    }

    if (event.type === "customer.subscription.deleted") {
      const sub = event.data.object as Stripe.Subscription;
      const companyId = String(sub.metadata?.company_id ?? "");
      if (companyId) {
        await setPlan(admin, companyId, "FREE", "CANCELED", null, null);
      }
    }

    if (event.type === "invoice.payment_failed") {
      const inv = event.data.object as Stripe.Invoice;
      const companyId = String(inv.subscription_details?.metadata?.company_id ?? inv.metadata?.company_id ?? "");
      if (companyId) {
        console.log(`[${functionName}] payment_failed`, { companyId });
        await admin.from("company_billing").update({ status: "PAST_DUE" }).eq("company_id", companyId);
      }
    }

    return new Response(JSON.stringify({ received: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error(`[${functionName}] unexpected`, { error: String(error) });
    return new Response("Server error", { status: 500, headers: corsHeaders });
  }
});
