// @ts-nocheck
/// <reference types="https://deno.land/std@0.190.0/http/server.ts" />
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function log(msg: string, data?: any) {
  console.log('[qa-history] ' + msg, data ?? '');
}

function safeTrim(text: string | null | undefined, max = 2000) {
  if (!text) return null;
  return text.length <= max ? text : text.slice(0, max) + '... [truncated]';
}

function inferTestType(workflowName: string | null): string {
  if (!workflowName) return 'unknown';
  if (workflowName.includes('qa_quick')) return 'quick';
  if (workflowName.includes('qa_full')) return 'full';
  if (workflowName.includes('qa_custom')) return 'custom';
  return 'unknown';
}

function formatDuration(startedAt: string | null, completedAt: string | null): number {
  if (!startedAt || !completedAt) return 0;
  try {
    const start = new Date(startedAt).getTime();
    const end = new Date(completedAt).getTime();
    return Math.floor((end - start) / 1000); // duration in seconds
  } catch {
    return 0;
  }
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (req.method !== 'GET') {
      return new Response(
        JSON.stringify({ error: 'Method not allowed' }),
        { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Extract query parameters
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get('page') || '1', 10);
    const perPage = Math.min(parseInt(url.searchParams.get('per_page') || '10', 10), 50);
    const testTypeFilter = url.searchParams.get('test_type') || 'all';
    const statusFilter = url.searchParams.get('status') || 'all';

    log('Fetching QA history', { page, perPage, testTypeFilter, statusFilter });

    // Authentication check
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Unauthorized: No authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i);
    const token = tokenMatch ? tokenMatch[1] : authHeader;

    // Supabase env
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://gohcnlyonuoeszaqjsxw.supabase.co';
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY') || '';

    // Verify JWT with Supabase
    let userResp;
    try {
      userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': supabaseAnon,
        }
      });
    } catch (err) {
      log('Supabase /auth fetch network error', String(err));
      return new Response(
        JSON.stringify({ error: 'Network error contacting Supabase auth', details: String(err) }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!userResp.ok) {
      const errText = await userResp.text().catch(() => '');
      log('Supabase auth failed', { status: userResp.status, body: safeTrim(errText) });
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid token', details: safeTrim(errText) }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const userData = await userResp.json().catch((e) => {
      log('Failed to parse user JSON', String(e));
      return null;
    });

    const userId = userData?.id;
    if (!userId) {
      log('Missing user id in user data', { userData });
      return new Response(
        JSON.stringify({ error: 'Unauthorized: Invalid user data' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if user is MASTERADMIN
    const profilesResp = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=role`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseAnon,
      }
    });

    if (!profilesResp.ok) {
      const txt = await profilesResp.text().catch(() => '');
      log('Profiles fetch failed', { status: profilesResp.status, body: safeTrim(txt) });
      return new Response(
        JSON.stringify({ error: 'Error checking user role', details: safeTrim(txt) }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const profiles = await profilesResp.json().catch((e) => {
      log('Failed to parse profiles JSON', String(e));
      return null;
    });

    const userRole = profiles?.[0]?.role;
    if (userRole !== 'MASTERADMIN') {
      log('Forbidden: user not MASTERADMIN', { userId, role: userRole });
      return new Response(
        JSON.stringify({ error: 'Forbidden: Only MASTERADMIN can access QA history', role: userRole }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // GitHub token and repository
    const githubToken = Deno.env.get('GITHUB_TOKEN');
    const repoEnv = Deno.env.get('GITHUB_REPOSITORY');
    const repo = repoEnv || 'your-repo-owner/your-repo';

    if (!githubToken) {
      log('Missing GITHUB_TOKEN');
      return new Response(
        JSON.stringify({ error: 'Server configuration error: GITHUB_TOKEN not set' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const repoFormatOk = /^[^/\s]+\/[^/\s]+$/.test(repo);
    if (!repoFormatOk) {
      log('Invalid GITHUB_REPOSITORY value', { repo });
      return new Response(
        JSON.stringify({ error: 'Server configuration error: invalid GITHUB_REPOSITORY', repo }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch runs from all QA workflows
    const workflows = ['qa_quick.yml', 'qa_full.yml', 'qa_custom.yml'];
    const allRuns: any[] = [];

    for (const workflow of workflows) {
      try {
        const runsUrl = `https://api.github.com/repos/${repo}/actions/workflows/${workflow}/runs?per_page=50`;
        const resp = await fetch(runsUrl, {
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github+json',
          },
        });

        if (resp.ok) {
          const data = await resp.json();
          const runs = data.workflow_runs || [];
          log(`Fetched ${runs.length} runs from ${workflow}`);

          // Add test_type to each run
          const enrichedRuns = runs.map((run: any) => ({
            ...run,
            test_type: inferTestType(run.name),
            workflow_file: workflow,
            duration_seconds: formatDuration(run.started_at, run.updated_at),
          }));

          allRuns.push(...enrichedRuns);
        } else {
          log(`Failed to fetch runs from ${workflow}`, { status: resp.status });
        }
      } catch (err) {
        log(`Error fetching runs from ${workflow}`, String(err));
      }
    }

    // Sort all runs by created_at (newest first)
    allRuns.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime();
      const dateB = new Date(b.created_at).getTime();
      return dateB - dateA;
    });

    // Apply filters
    let filteredRuns = allRuns;

    if (testTypeFilter !== 'all') {
      filteredRuns = filteredRuns.filter(run => run.test_type === testTypeFilter);
    }

    if (statusFilter !== 'all') {
      if (statusFilter === 'success') {
        filteredRuns = filteredRuns.filter(run => run.conclusion === 'success');
      } else if (statusFilter === 'failure') {
        filteredRuns = filteredRuns.filter(run => run.conclusion === 'failure');
      } else if (statusFilter === 'cancelled') {
        filteredRuns = filteredRuns.filter(run => run.conclusion === 'cancelled');
      } else if (statusFilter === 'in_progress') {
        filteredRuns = filteredRuns.filter(run => run.status === 'in_progress' || run.status === 'queued');
      }
    }

    // Pagination
    const totalItems = filteredRuns.length;
    const totalPages = Math.ceil(totalItems / perPage);
    const startIndex = (page - 1) * perPage;
    const endIndex = startIndex + perPage;
    const paginatedRuns = filteredRuns.slice(startIndex, endIndex);

    // Format response
    const formattedRuns = paginatedRuns.map((run: any) => ({
      id: run.id,
      name: run.name,
      testType: run.test_type,
      status: run.status,
      conclusion: run.conclusion,
      htmlUrl: run.html_url,
      createdAt: run.created_at,
      updatedAt: run.updated_at,
      durationSeconds: run.duration_seconds,
      workflowFile: run.workflow_file,
      headBranch: run.head_branch,
      headSha: run.head_sha,
      event: run.event,
    }));

    log('Returning QA history', {
      totalItems,
      totalPages,
      currentPage: page,
      returnedItems: formattedRuns.length,
    });

    return new Response(JSON.stringify({
      runs: formattedRuns,
      pagination: {
        totalItems,
        totalPages,
        currentPage: page,
        perPage,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    });
  } catch (err) {
    log('Unexpected error', { error: String(err), stack: err?.stack });
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: String(err) }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
