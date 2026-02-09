import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type ProfileRow = {
  id: string;
  email: string;
  company_id: string | null;
  role: string;
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Verify the JWT and extract the user email.
    const supabaseAuth = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userErr } = await supabaseAuth.auth.getUser(token);
    if (userErr || !userData.user?.email) {
      console.error("[tenant-unify] auth.getUser failed", { userErr });
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    const email = userData.user.email.toLowerCase();

    const admin = createClient(supabaseUrl, serviceRoleKey);

    const { data: profiles, error: pErr } = await admin
      .from("profiles")
      .select("id,email,company_id,role")
      .eq("email", email);

    if (pErr) {
      console.error("[tenant-unify] profiles select failed", { pErr });
      return new Response("Error", { status: 500, headers: corsHeaders });
    }

    const rows = ((profiles ?? []) as any as ProfileRow[]).filter((p) => p.company_id);

    // Nothing to unify.
    if (rows.length <= 1) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Pick the principal company: the one with the most profiles (users). Tie-breaker: most tracks.
    const byCompany = new Map<string, { users: number; tracks: number }>();
    for (const r of rows) {
      const cid = r.company_id!;
      const cur = byCompany.get(cid) ?? { users: 0, tracks: 0 };
      cur.users += 1;
      byCompany.set(cid, cur);
    }

    // Enrich with tracks count (best-effort).
    for (const cid of byCompany.keys()) {
      const { count } = await admin
        .from("learning_tracks")
        .select("id", { count: "exact", head: true })
        .eq("company_id", cid);
      const cur = byCompany.get(cid)!;
      cur.tracks = count ?? 0;
      byCompany.set(cid, cur);
    }

    let principalCompanyId: string | null = null;
    let bestScore = -1;
    for (const [cid, stat] of byCompany.entries()) {
      const score = stat.users * 1000 + stat.tracks;
      if (score > bestScore) {
        bestScore = score;
        principalCompanyId = cid;
      }
    }

    if (!principalCompanyId) {
      return new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Normalize: set all profiles with this email to the principal company.
    const { error: uErr } = await admin
      .from("profiles")
      .update({ company_id: principalCompanyId })
      .eq("email", email);

    if (uErr) {
      console.error("[tenant-unify] profiles update failed", { uErr });
      return new Response("Error", { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ ok: true, company_id: principalCompanyId }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("[tenant-unify] unexpected error", { e });
    return new Response("Error", { status: 500, headers: corsHeaders });
  }
});
