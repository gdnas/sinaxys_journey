// @ts-nocheck
/// <reference types="https://deno.land/std@0.190.0/http/server.ts" />
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function log(msg: string, data?: any) {
  console.log('[qa-status] ' + msg, data ?? '');
}

function safeTrim(text: string | null | undefined, max = 2000) {
  if (!text) return null;
  return text.length <= max ? text : text.slice(0, max) + '... [truncated]';
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Extract runId from GET query or POST body
    let runId: string | null = null
    if (req.method === 'GET') {
      const url = new URL(req.url)
      runId = url.searchParams.get('run_id')
    } else {
      // POST
      const text = await req.text()
      if (text) {
        try {
          const body = JSON.parse(text)
          runId = body?.run_id ?? body?.runId ?? null
        } catch (e) {
          log('Failed to parse JSON body', String(e))
          return new Response(JSON.stringify({ error: 'Invalid JSON body' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
        }
      }
    }

    if (!runId) {
      return new Response(JSON.stringify({ error: 'run_id parameter is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Authentication check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized: No authorization header' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const tokenMatch = authHeader.match(/^Bearer\s+(.+)$/i)
    const token = tokenMatch ? tokenMatch[1] : authHeader

    // Supabase env
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || 'https://gohcnlyonuoeszaqjsxw.supabase.co'
    const supabaseAnon = Deno.env.get('SUPABASE_ANON_KEY') || ''

    // Verify JWT with Supabase
    let userResp
    try {
      userResp = await fetch(`${supabaseUrl}/auth/v1/user`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'apikey': supabaseAnon,
        }
      })
    } catch (err) {
      log('Supabase /auth fetch network error', String(err))
      return new Response(JSON.stringify({ error: 'Network error contacting Supabase auth', details: String(err) }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    if (!userResp.ok) {
      const errText = await userResp.text().catch(() => '')
      log('Supabase auth failed', { status: userResp.status, body: safeTrim(errText) })
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid token', details: safeTrim(errText) }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const userData = await userResp.json().catch((e) => {
      log('Failed to parse user JSON', String(e))
      return null
    })

    const userId = userData?.id
    if (!userId) {
      log('Missing user id in user data', { userData })
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid user data' }), { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Check if user is MASTERADMIN
    const profilesResp = await fetch(`${supabaseUrl}/rest/v1/profiles?id=eq.${userId}&select=role`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': supabaseAnon,
      }
    })

    if (!profilesResp.ok) {
      const txt = await profilesResp.text().catch(() => '')
      log('Profiles fetch failed', { status: profilesResp.status, body: safeTrim(txt) })
      return new Response(JSON.stringify({ error: 'Error checking user role', details: safeTrim(txt) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const profiles = await profilesResp.json().catch((e) => {
      log('Failed to parse profiles JSON', String(e))
      return null
    })

    const userRole = profiles?.[0]?.role
    if (userRole !== 'MASTERADMIN') {
      log('Forbidden: user not MASTERADMIN', { userId, role: userRole })
      return new Response(JSON.stringify({ error: 'Forbidden: Only MASTERADMIN can check QA status', role: userRole }), { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // GitHub token and repository
    const githubToken = Deno.env.get('GITHUB_TOKEN')
    const repoEnv = Deno.env.get('GITHUB_REPOSITORY')
    const repo = repoEnv || 'your-repo-owner/your-repo'

    const repoFormatOk = /^[^/\s]+\/[^/\s]+$/.test(repo)
    if (!githubToken) {
      log('Missing GITHUB_TOKEN')
      return new Response(JSON.stringify({ error: 'Server configuration error: GITHUB_TOKEN not set' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }
    if (!repoFormatOk) {
      log('Invalid GITHUB_REPOSITORY value', { repo })
      return new Response(JSON.stringify({ error: 'Server configuration error: invalid GITHUB_REPOSITORY', repo }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    // Fetch run details
    const runUrl = `https://api.github.com/repos/${repo}/actions/runs/${runId}`
    log('Fetching run details', { runUrl })
    const runResp = await fetch(runUrl, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github+json',
      },
    })

    if (!runResp.ok) {
      const text = await runResp.text().catch(() => '')
      log('Failed to fetch run status', { status: runResp.status, body: safeTrim(text) })
      return new Response(JSON.stringify({ error: 'Failed to fetch run status', status: runResp.status, details: safeTrim(text) }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
    }

    const runData = await runResp.json().catch((e) => {
      log('Failed to parse run JSON', String(e))
      return null
    })

    const { status, conclusion, created_at, updated_at, html_url } = runData || {}

    // Fetch jobs
    const jobsUrl = `https://api.github.com/repos/${repo}/actions/runs/${runId}/jobs`
    log('Fetching run jobs', { jobsUrl })
    const jobsResp = await fetch(jobsUrl, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github+json',
      },
    })

    let jobs: any[] = []
    let logsUrl: string | null = null

    if (jobsResp.ok) {
      const jobsData = await jobsResp.json().catch((e) => {
        log('Failed to parse jobs JSON', String(e))
        return null
      })
      jobs = jobsData?.jobs || []

      if (jobs.length > 0) {
        // Provide the logs URL (note: this is a URL to the logs resource)
        logsUrl = `https://api.github.com/repos/${repo}/actions/jobs/${jobs[0].id}/logs`
      }
    } else {
      const txt = await jobsResp.text().catch(() => '')
      log('Jobs fetch failed', { status: jobsResp.status, body: safeTrim(txt) })
    }

    const jobSteps = jobs.map((job: any) => ({
      name: job.name,
      status: job.status,
      conclusion: job.conclusion,
      started_at: job.started_at,
      completed_at: job.completed_at,
    }))

    log('Returning run status', { runId, status, conclusion, jobs: jobSteps.length })

    return new Response(JSON.stringify({
      runId,
      status,
      conclusion,
      html_url,
      createdAt: created_at,
      updatedAt: updated_at,
      jobs: jobSteps,
      logsUrl,
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
  } catch (err) {
    log('Unexpected error', { error: String(err), stack: err?.stack })
    return new Response(JSON.stringify({ error: 'Internal server error', details: String(err) }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  }
})