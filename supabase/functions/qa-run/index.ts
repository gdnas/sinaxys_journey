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

function log(msg: string, data?: any) {
  console.log(`[qa-run] ${msg}`, data ?? "");
}

serve(async (req) => {
  log("Request received", { method: req.method, url: req.url });

  // CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    log("Method not allowed", { method: req.method });
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  try {
    // Auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      log("Missing auth header");
      return new Response(
        JSON.stringify({ 
          error: "Unauthorized: No Authorization header",
          debug: { hasAuthHeader: false }
        }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!tokenMatch) {
      log("Invalid auth header format", { header: authHeader });
      return new Response(
        JSON.stringify({ 
          error: "Unauthorized: Invalid Authorization header format",
          debug: { authHeader }
        }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const token = tokenMatch[1];

    // Check environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY");
    const githubToken = Deno.env.get("GITHUB_TOKEN");
    const repoEnv = Deno.env.get("GITHUB_REPOSITORY");

    log("Environment check", { 
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseAnon: !!supabaseAnon,
      hasGithubToken: !!githubToken,
      hasRepoEnv: !!repoEnv,
      repo: repoEnv || "your-repo-owner/your-repo (default)"
    });

    if (!supabaseUrl || !supabaseAnon) {
      return new Response(
        JSON.stringify({ 
          error: "Server misconfiguration: SUPABASE_URL or SUPABASE_ANON_KEY not set",
          debug: { hasSupabaseUrl: !!supabaseUrl, hasSupabaseAnon: !!supabaseAnon }
        }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user via Supabase auth endpoint
    const userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnon,
      },
    });

    log("Supabase user check", { 
      url: `${supabaseUrl}/auth/v1/user`,
      status: userResp.status,
      ok: userResp.ok
    });

    if (!userResp.ok) {
      const errorText = await userResp.text().catch(() => "Unknown error");
      log("Supabase auth failed", { status: userResp.status, error: errorText });
      return new Response(
        JSON.stringify({ 
          error: "Unauthorized: invalid token",
          details: errorText.substring(0, 500),
          debug: { supabaseStatus: userResp.status }
        }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let userData;
    try {
      userData = await userResp.json();
    } catch (parseError) {
      log("Failed to parse user response", { error: String(parseError) });
      return new Response(
        JSON.stringify({ 
          error: "Unauthorized: invalid user data (parse error)",
          debug: { parseError: String(parseError) }
        }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData?.id;
    if (!userId) {
      log("Missing userId in user data", { userData });
      return new Response(
        JSON.stringify({ 
          error: "Unauthorized: invalid user data (no id)",
          debug: { userData }
        }), 
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ensure MASTERADMIN role
    const profilesResp = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=role`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: supabaseAnon,
      },
    });

    log("Profile check", { 
      url: `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=role`,
      status: profilesResp.status,
      ok: profilesResp.ok
    });

    if (!profilesResp.ok) {
      const errorText = await profilesResp.text().catch(() => "Unknown error");
      log("Profile fetch failed", { status: profilesResp.status, error: errorText });
      return new Response(
        JSON.stringify({ 
          error: "Error checking user role",
          details: errorText.substring(0, 500),
          debug: { profilesStatus: profilesResp.status }
        }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let profiles;
    try {
      profiles = await profilesResp.json();
    } catch (parseError) {
      log("Failed to parse profiles response", { error: String(parseError) });
      return new Response(
        JSON.stringify({ 
          error: "Error parsing profiles data (parse error)",
          debug: { parseError: String(parseError) }
        }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userRole = profiles?.[0]?.role;
    log("User role check", { userId, role: userRole });

    if (userRole !== "MASTERADMIN") {
      log("Forbidden: not MASTERADMIN", { role: userRole });
      return new Response(
        JSON.stringify({ 
          error: "Forbidden: Only MASTERADMIN can trigger QA",
          debug: { userRole }
        }), 
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting check
    const now = Date.now();
    const lastRun = recentRuns.get(userId);
    if (lastRun && (now - lastRun) < RATE_LIMIT_MS) {
      log("Rate limit exceeded", { userId, lastRun, now });
      return new Response(
        JSON.stringify({ 
          error: "Too many requests: Please wait before triggering another QA run",
          debug: { lastRun: lastRun, now: now, diff: now - lastRun }
        }), 
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    recentRuns.set(userId, now);

    // Clean up old entries (keep only last 100 entries)
    if (recentRuns.size > 100) {
      const oldestKey = Array.from(recentRuns.keys())[0];
      recentRuns.delete(oldestKey);
    }

    // GitHub token check
    if (!githubToken) {
      log("Missing GITHUB_TOKEN");
      return new Response(
        JSON.stringify({ 
          error: "Server misconfiguration: GITHUB_TOKEN not set",
          debug: { hasGithubToken: false }
        }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const repo = repoEnv || "your-repo-owner/your-repo";
    const workflowPath = "qa_on_demand.yml";

    // Dispatch workflow
    const dispatchUrl = `https://api.github.com/repos/${repo}/actions/workflows/${workflowPath}/dispatches`;
    log("Dispatching workflow", { dispatchUrl });

    const workflowResp = await fetch(dispatchUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "Supabase-Edge-Function",
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

    log("Dispatch response", { status: workflowResp.status });

    if (!workflowResp.ok) {
      const errorText = await workflowResp.text().catch(() => "Unknown error");
      log("Dispatch failed", { status: workflowResp.status, error: errorText });
      return new Response(
        JSON.stringify({ 
          error: "Failed to dispatch workflow",
          details: errorText.substring(0, 500),
          debug: { workflowStatus: workflowResp.status }
        }), 
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Wait a moment for run to be created
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Try to find the created run (race condition possible) — retry a few times
    const runsListUrl = `https://api.github.com/repos/${repo}/actions/workflows/${workflowPath}/runs`;
    const maxAttempts = 6;
    const attemptDelayMs = 2000;
    let foundRun = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      log(`Attempt ${attempt} to find run`, { attemptDelayMs });

      try {
        const runsResp = await fetch(`${runsListUrl}?per_page=10`, {
          headers: {
            Authorization: `Bearer ${githubToken}`,
            Accept: "application/vnd.github+json",
          },
        });

        if (!runsResp.ok) {
          const errorText = await runsResp.text().catch(() => "Unknown error");
          log(`Runs fetch failed (attempt ${attempt})`, { status: runsResp.status, error: errorText });
        } else {
          const runsData = await runsResp.json();
          
          // Defensive: check if runsData is valid before accessing properties
          if (!runsData || typeof runsData !== "object") {
            log("Invalid runsData response", { runsData });
            // Continue to next attempt
            await new Promise((resolve) => setTimeout(resolve, attemptDelayMs));
            continue;
          }

          const workflow_runs = runsData.workflow_runs || [];
          
          log(`Attempt ${attempt} - runs found`, { count: workflow_runs.length });

          // prefer a recent run (created within last 3 minutes)
          const nowTs = Date.now();
          const recent = workflow_runs.find((r) => {
            try {
              const created = new Date(r.created_at).getTime();
              return nowTs - created < 3 * 60 * 1000; // 3 minutes
            } catch {
              log("Failed to parse created_at", { created_at: r.created_at });
              return false;
            }
          });

          if (recent) {
            foundRun = recent;
            log("Found recent run", { id: recent.id, created_at: recent.created_at });
            break;
          }
        }
      } catch (err) {
        log(`Attempt ${attempt} error`, { error: String(err) });
      }

      // Wait before next attempt
      await new Promise((resolve) => setTimeout(resolve, attemptDelayMs));
    }

    if (foundRun) {
      log("Returning run details", { runId: foundRun.id, status: foundRun.status });
      return new Response(
        JSON.stringify({
          runId: String(foundRun.id),
          status: foundRun.status,
          htmlUrl: foundRun.html_url,
          createdAt: foundRun.created_at,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // If we couldn't find the run, still return dispatched=true and a link to actions page
    const workflowPage = `https://github.com/${repo}/actions/runs`;
    log("Run not found, returning workflow page link", { workflowPage });

    return new Response(
      JSON.stringify({
        dispatched: true,
        note: "Workflow dispatched but run not yet found; check GitHub Actions page. The function retried looking for the run.",
        workflowUrl: workflowPage,
      }),
      {
        status: 202,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    log("Unexpected error", { error: String(err), stack: err.stack });
    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: String(err),
        type: err.constructor.name
      }), 
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});