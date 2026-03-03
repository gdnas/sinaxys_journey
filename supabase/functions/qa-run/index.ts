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

function safeTrim(text: string | null | undefined, max = 3000) {
  if (!text) return null;
  if (text.length <= max) return text;
  return text.slice(0, max) + "... [truncated]";
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
    // Parse request body
    let body: any = {};
    try {
      const text = await req.text();
      if (text) {
        body = JSON.parse(text);
      }
    } catch (e) {
      log('Failed to parse request body', String(e));
    }

    const testType = body.test_type || 'full';
    const validTestTypes = ['quick', 'full', 'custom'];
    if (!validTestTypes.includes(testType)) {
      log('Invalid test_type', { testType });
      return new Response(
        JSON.stringify({ error: 'Invalid test_type', validTestTypes }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      log("Missing auth header");
      return new Response(
        JSON.stringify({
          error: "Unauthorized: No Authorization header",
          debug: { hasAuthHeader: false },
        }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!tokenMatch) {
      log("Invalid auth header format", { header: authHeader });
      return new Response(
        JSON.stringify({ error: "Unauthorized: Invalid Authorization header format", debug: { authHeader } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    const token = tokenMatch[1];

    // Check environment variables
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnon = Deno.env.get("SUPABASE_ANON_KEY");
    const githubToken = Deno.env.get("GITHUB_TOKEN");
    const repoEnv = Deno.env.get("GITHUB_REPOSITORY");

    // Select workflow based on test_type
    let workflowFile: string;
    let workflowInputs: any = { trigger_user: '', trigger_source: 'web' };

    if (testType === 'quick') {
      workflowFile = 'qa_quick.yml';
      workflowInputs.trigger_user = body.trigger_user || '';
    } else if (testType === 'full') {
      workflowFile = 'qa_full.yml';
      workflowInputs.trigger_user = body.trigger_user || '';
    } else if (testType === 'custom') {
      workflowFile = 'qa_custom.yml';
      workflowInputs.trigger_user = body.trigger_user || '';
      workflowInputs.run_lint = body.run_lint !== undefined ? body.run_lint : true;
      workflowInputs.run_typecheck = body.run_typecheck !== undefined ? body.run_typecheck : true;
      workflowInputs.run_unit = body.run_unit !== undefined ? body.run_unit : false;
      workflowInputs.run_e2e = body.run_e2e !== undefined ? body.run_e2e : false;
    }

    log("Environment check", {
      hasSupabaseUrl: !!supabaseUrl,
      hasSupabaseAnon: !!supabaseAnon,
      hasGithubToken: !!githubToken,
      hasRepoEnv: !!repoEnv,
      repo: repoEnv || "your-repo-owner/your-repo (default)",
      testType,
      workflowFile,
    });

    if (!supabaseUrl || !supabaseAnon) {
      return new Response(
        JSON.stringify({
          error: "Server misconfiguration: SUPABASE_URL or SUPABASE_ANON_KEY not set",
          debug: { hasSupabaseUrl: !!supabaseUrl, hasSupabaseAnon: !!supabaseAnon },
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify user via Supabase auth endpoint
    let userResp;
    try {
      userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: supabaseAnon,
        },
      });
    } catch (err) {
      log("Supabase user fetch error", String(err));
      return new Response(
        JSON.stringify({ error: "Network error when contacting Supabase auth", details: String(err) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log("Supabase user check", { url: `${supabaseUrl}/auth/v1/user`, status: userResp.status, ok: userResp.ok });

    if (!userResp.ok) {
      const errorText = await userResp.text().catch(() => "");
      log("Supabase auth failed", { status: userResp.status, error: safeTrim(errorText) });
      return new Response(
        JSON.stringify({ error: "Unauthorized: invalid token", details: safeTrim(errorText), debug: { supabaseStatus: userResp.status } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let userData;
    try {
      userData = await userResp.json();
    } catch (parseError) {
      log("Failed to parse user response", { error: String(parseError) });
      return new Response(
        JSON.stringify({ error: "Unauthorized: invalid user data (parse error)", debug: { parseError: String(parseError) } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = userData?.id;
    if (!userId) {
      log("Missing userId in user data", { userData });
      return new Response(
        JSON.stringify({ error: "Unauthorized: invalid user data (no id)", debug: { userData } }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Ensure MASTERADMIN role
    let profilesResp;
    try {
      profilesResp = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=role`, {
        headers: {
          Authorization: `Bearer ${token}`,
          apikey: supabaseAnon,
        },
      });
    } catch (err) {
      log("Profiles fetch network error", String(err));
      return new Response(
        JSON.stringify({ error: "Network error when contacting Supabase profiles", details: String(err) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log("Profile check", { url: `${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=role`, status: profilesResp.status, ok: profilesResp.ok });

    if (!profilesResp.ok) {
      const errorText = await profilesResp.text().catch(() => "");
      log("Profile fetch failed", { status: profilesResp.status, error: safeTrim(errorText) });
      return new Response(
        JSON.stringify({ error: "Error checking user role", details: safeTrim(errorText), debug: { profilesStatus: profilesResp.status } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let profiles;
    try {
      profiles = await profilesResp.json();
    } catch (parseError) {
      log("Failed to parse profiles response", { error: String(parseError) });
      return new Response(
        JSON.stringify({ error: "Error parsing profiles data (parse error)", debug: { parseError: String(parseError) } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userRole = profiles?.[0]?.role;
    log("User role check", { userId, role: userRole });

    if (userRole !== "MASTERADMIN") {
      log("Forbidden: not MASTERADMIN", { role: userRole });
      return new Response(
        JSON.stringify({ error: "Forbidden: Only MASTERADMIN can trigger QA", debug: { userRole } }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate limiting check
    const now = Date.now();
    const lastRun = recentRuns.get(userId);
    if (lastRun && now - lastRun < RATE_LIMIT_MS) {
      log("Rate limit exceeded", { userId, lastRun, now });
      return new Response(
        JSON.stringify({ error: "Too many requests: Please wait before triggering another QA run", debug: { lastRun: lastRun, now: now, diff: now - lastRun } }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    recentRuns.set(userId, now);

    if (recentRuns.size > 100) {
      const oldestKey = Array.from(recentRuns.keys())[0];
      recentRuns.delete(oldestKey);
    }

    // GitHub token check
    if (!githubToken) {
      log("Missing GITHUB_TOKEN");
      return new Response(
        JSON.stringify({ error: "Server misconfiguration: GITHUB_TOKEN not set", debug: { hasGithubToken: false } }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const repo = repoEnv || "your-repo-owner/your-repo";

    // VALIDATION: ensure repo looks like owner/repo and user didn't accidentally paste the token there
    const repoLooksLikeToken = /^ghp_[A-Za-z0-9_-]{20,}$/.test(repo);
    const repoFormatOk = /^[^/\s]+\/[^/\s]+$/.test(repo);
    if (!repoFormatOk || repoLooksLikeToken) {
      log("Invalid GITHUB_REPOSITORY value", { repo });
      return new Response(
        JSON.stringify({
          error: "Invalid GITHUB_REPOSITORY configured",
          details: "Please set GITHUB_REPOSITORY as 'owner/repo' and ensure GITHUB_TOKEN stores the token. It looks like the repository value is incorrect or contains a token.",
          debug: { repo },
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const workflowPath = workflowFile;

    // Pre-check: validate repo access with a quick GET to the repo API
    const repoUrl = `https://api.github.com/repos/${repo}`;
    let dispatchRef = 'main';
    try {
      const repoCheck = await fetch(repoUrl, {
        headers: { Authorization: `Bearer ${githubToken}`, Accept: "application/vnd.github+json" },
      });
      log('Repo check', { status: repoCheck.status });
      if (!repoCheck.ok) {
        const txt = await repoCheck.text().catch(() => '');
        log('Repo check failed', { status: repoCheck.status, body: safeTrim(txt) });
        return new Response(
          JSON.stringify({ error: 'Repository access check failed', status: repoCheck.status, details: safeTrim(txt) }),
          { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // If repo is accessible, read default_branch so we dispatch to correct ref
      try {
        const repoData = await repoCheck.json();
        dispatchRef = repoData?.default_branch || 'main';
        log('Repository default branch', { dispatchRef });
      } catch (e) {
        log('Failed to parse repo JSON, falling back to main', String(e));
      }
    } catch (err) {
      log('Repo check network error', String(err));
      return new Response(
        JSON.stringify({ error: 'Network error while checking repository', details: String(err) }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Dispatch workflow
    const dispatchUrl = `https://api.github.com/repos/${repo}/actions/workflows/${workflowFile}/dispatches`;

    // GitHub API expects workflow_dispatch inputs to be strings. Convert booleans/numbers to strings.
    const sanitizedInputs: Record<string, string> = {};
    for (const key of Object.keys(workflowInputs)) {
      const val = workflowInputs[key];
      if (typeof val === 'boolean') sanitizedInputs[key] = val ? 'true' : 'false';
      else if (val === null || val === undefined) sanitizedInputs[key] = '';
      else sanitizedInputs[key] = String(val);
    }

    log("Dispatching workflow", { dispatchUrl, workflowFile, inputs: sanitizedInputs, ref: dispatchRef });

    let workflowResp;
    try {
      workflowResp = await fetch(dispatchUrl, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${githubToken}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "supabase-edge-function",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ ref: dispatchRef, inputs: sanitizedInputs }),
      });
    } catch (err) {
      log("Dispatch network error", String(err));
      return new Response(
        JSON.stringify({ error: "Network error dispatching workflow", details: String(err) }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    log("Dispatch response", { status: workflowResp.status });

    if (!workflowResp.ok) {
      const errorText = await workflowResp.text().catch(() => "");
      const raw = safeTrim(errorText, 4000);
      log("Dispatch failed", { status: workflowResp.status, raw });
      return new Response(
        JSON.stringify({
          error: "Failed to dispatch workflow",
          status: workflowResp.status,
          details: raw,
          debug: { dispatchUrl, repo, workflowPath },
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Wait a moment for run to be created
    await new Promise((resolve) => setTimeout(resolve, 2000));

    // Try to find the created run (race condition possible) — retry a few times
    const runsListUrl = `https://api.github.com/repos/${repo}/actions/workflows/${workflowFile}/runs`;
    const maxAttempts = 6;
    const attemptDelayMs = 2000;
    let foundRun = null;
    let lastRunsError = null;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      log(`Attempt ${attempt} to find run for workflow ${workflowFile}`, { attemptDelayMs });

      try {
        const runsResp = await fetch(`${runsListUrl}?per_page=10`, {
          headers: { Authorization: `Bearer ${githubToken}`, Accept: "application/vnd.github+json" },
        });

        if (!runsResp.ok) {
          const errorText = await runsResp.text().catch(() => "");
          lastRunsError = { status: runsResp.status, raw: safeTrim(errorText, 4000) };
          log(`Runs fetch failed (attempt ${attempt})`, lastRunsError);
        } else {
          const runsData = await runsResp.json().catch((e) => {
            log("Failed to parse runsData JSON", String(e));
            return null;
          });

          if (!runsData || typeof runsData !== "object") {
            log("Invalid runsData response", { runsData });
            await new Promise((resolve) => setTimeout(resolve, attemptDelayMs));
            continue;
          }

          const workflow_runs = runsData.workflow_runs || [];
          log(`Attempt ${attempt} - runs found`, { count: workflow_runs.length });

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
        lastRunsError = { exception: String(err) };
      }

      await new Promise((resolve) => setTimeout(resolve, attemptDelayMs));
    }

    if (foundRun) {
      log("Returning run details", { runId: foundRun.id, status: foundRun.status, testType });
      return new Response(
        JSON.stringify({ runId: String(foundRun.id), status: foundRun.status, htmlUrl: foundRun.html_url, createdAt: foundRun.created_at, testType, workflowFile }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const workflowPage = `https://github.com/${repo}/actions/runs`;
    log("Run not found, returning workflow page link", { workflowPage, lastRunsError, testType, workflowFile });

    return new Response(
      JSON.stringify({ dispatched: true, note: "Workflow dispatched but run not yet found; check GitHub Actions page.", workflowUrl: workflowPage, lastRunsError, testType, workflowFile }),
      { status: 202, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    log("Unexpected error", { error: String(err), stack: err?.stack });
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(err), type: err?.constructor?.name }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});