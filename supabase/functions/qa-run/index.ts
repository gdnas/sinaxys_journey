// @ts-nocheck
/// <reference types="https://deno.land/std@0.190.0/http/server.ts" />
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// In-memory rate limiting (simple approach)
const recentRuns = new Map<string, number>();
const RATE_LIMIT_MS = 60000; // 1 minute

serve(async (req) => {
  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    // Auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized: No Authorization header" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");

    // Verify user via Supabase auth endpoint
    const supabaseUrl = Deno.env.get("SUPABASE_URL") || "https://gohcnlyonuoeszaqjsxw.supabase.co";
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY") || "";
    const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnon,
      },
    });

    if (!userResp.ok) {
      const t = await userResp.text().catch(() => "");
      return new Response(JSON.stringify({ error: "Unauthorized: invalid token", details: t }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userData = await userResp.json();
    const userId = userData?.id;
    if (!userId) {
      return new Response(JSON.stringify({ error: "Unauthorized: invalid user data" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure MASTERADMIN role
    const profilesResp = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=role`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnon,
      },
    });

    if (!profilesResp.ok) {
      const t = await profilesResp.text().catch(() => "");
      return new Response(JSON.stringify({ error: "Error checking user role", details: t }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const profiles = await profilesResp.json();
    const userRole = profiles?.[0]?.role;
    if (userRole !== "MASTERADMIN") {
      return new Response(JSON.stringify({ error: "Forbidden: Only MASTERADMIN can trigger QA" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limiting per user
    const now = Date.now();
    const lastRun = recentRuns.get(userId);
    if (lastRun && now - lastRun < RATE_LIMIT_MS) {
      return new Response(JSON.stringify({ error: "Too many requests: wait before triggering another QA run" }), {
        status: 429,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    recentRuns.set(userId, now);
    if (recentRuns.size > 100) {
      const oldestKey = Array.from(recentRuns.keys())[0];
      recentRuns.delete(oldestKey);
    }

    // GitHub token and repo
    const githubToken = Deno.env.get("GITHUB_TOKEN");
    if (!githubToken) {
      return new Response(JSON.stringify({ error: "Server misconfiguration: GITHUB_TOKEN not set" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Repository (support env var to avoid hardcoding)
    const repo = Deno.env.get("GITHUB_REPOSITORY") || "your-repo-owner/your-repo";
    const workflowPath = "qa_on_demand.yml";

    // Dispatch workflow
    const dispatchUrl = `https://api.github.com/repos/${repo}/actions/workflows/${workflowPath}/dispatches`;
    const workflowResp = await fetch(dispatchUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "supabase-edge-function",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: "main",
        inputs: {
          trigger_user: userId,
          trigger_source: "web",
        },
      }),
    });

    if (!workflowResp.ok) {
      const txt = await workflowResp.text().catch(() => "");
      console.error("[qa-run] dispatch failed", workflowResp.status, txt);
      return new Response(JSON.stringify({ error: "Failed to dispatch workflow", status: workflowResp.status, details: txt }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try to find the created run (race condition possible) — retry a few times
    const runsListUrl = `https://api.github.com/repos/${repo}/actions/workflows/${workflowPath}/runs`;
    const maxAttempts = 6;
    const attemptDelayMs = 2000;
    let foundRun = null;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const runsResp = await fetch(`${runsListUrl}?per_page=10`, {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github+json",
          },
        });

        if (!runsResp.ok) {
          const txt = await runsResp.text().catch(() => "");
          console.warn("[qa-run] runs list non-ok", runsResp.status, txt);
        } else {
          const runsData = await runsResp.json();
          const workflow_runs = runsData?.workflow_runs ?? [];

          // prefer a recent run (created within last 3 minutes)
          const nowTs = Date.now();
          const recent = workflow_runs.find((r) => {
            try {
              const created = new Date(r.created_at).getTime();
              return nowTs - created < 3 * 60 * 1000; // 3 minutes
            } catch {
              return false;
            }
          });

          if (recent) {
            foundRun = recent;
            break;
          }
        }
      } catch (err) {
        console.warn("[qa-run] runs fetch attempt error", String(err));
      }

      // wait before next attempt
      await new Promise((res) => setTimeout(res, attemptDelayMs));
    }

    const workflowPage = `https://github.com/${repo}/actions/runs`;
    if (foundRun) {
      return new Response(
        JSON.stringify({
          runId: String(foundRun.id),
          status: foundRun.status,
          htmlUrl: foundRun.html_url || workflowPage,
          createdAt: foundRun.created_at,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If we couldn't find the run, still return dispatched=true and a link to actions page
    return new Response(
      JSON.stringify({
        dispatched: true,
        note: "Workflow dispatched but run not yet found; check GitHub Actions page. The function retried looking for the run and did not find a recent run entry.",
        workflowUrl: workflowPage,
      }),
      {
        status: 202,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    console.error("[qa-run] unexpected error", String(err));
    return new Response(JSON.stringify({ error: "Internal server error", details: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});