// @ts-nocheck
/// <reference types="https://deno.land/std@0.190.0/http/server.ts" />
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    if (req.method !== 'GET' && req.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: corsHeaders })
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
        } catch {
          // ignore parse error
        }
      }
    }

    if (!runId) {
      return new Response('run_id parameter is required', { status: 400, headers: corsHeaders })
    }

    // Authentication check
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response('Unauthorized: No authorization header', { status: 401, headers: corsHeaders })
    }

    const token = authHeader.replace('Bearer ', '')

    // Verify JWT with Supabase
    const userResp = await fetch(`https://gohcnlyonuoeszaqjsxw.supabase.co/auth/v1/user`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': Deno.env.get('SUPABASE_ANON_KEY') || '',
      }
    })

    if (!userResp.ok) {
      return new Response('Unauthorized: Invalid token', { status: 401, headers: corsHeaders })
    }

    const userData = await userResp.json()
    const userId = userData.id

    if (!userId) {
      return new Response('Unauthorized: Invalid user data', { status: 401, headers: corsHeaders })
    }

    // Check if user is MASTERADMIN
    const profilesResp = await fetch(`https://gohcnlyonuoeszaqjsxw.supabase.co/rest/v1/profiles?id=eq.${userId}&select=role`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'apikey': Deno.env.get('SUPABASE_ANON_KEY') || '',
      }
    })

    if (!profilesResp.ok) {
      return new Response('Error checking user role', { status: 500, headers: corsHeaders })
    }

    const profiles = await profilesResp.json()
    const userRole = profiles[0]?.role

    if (userRole !== 'MASTERADMIN') {
      return new Response('Forbidden: Only MASTERADMIN can check QA status', { status: 403, headers: corsHeaders })
    }

    // Get workflow run status from GitHub
    const githubToken = Deno.env.get('GITHUB_TOKEN')
    if (!githubToken) {
      console.error('[qa-status] GITHUB_TOKEN not configured')
      return new Response('Server configuration error', { status: 500, headers: corsHeaders })
    }

    // Fetch run details with jobs
    const runResp = await fetch(`https://api.github.com/repos/your-repo-owner/your-repo/actions/runs/${runId}`, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github+json',
      },
    })

    if (!runResp.ok) {
      console.error('[qa-status] Failed to fetch run status')
      return new Response('Failed to fetch run status', { status: 500, headers: corsHeaders })
    }

    const runData = await runResp.json()
    const { status, conclusion, created_at, updated_at, html_url } = runData

    // Fetch logs for each job
    const jobsResp = await fetch(`https://api.github.com/repos/your-repo-owner/your-repo/actions/runs/${runId}/jobs`, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github+json',
      },
    })

    let jobs = []
    let logsUrl = null

    if (jobsResp.ok) {
      const jobsData = await jobsResp.json() as { jobs: any[] }
      jobs = jobsData.jobs || []
      
      // Try to get logs for first job
      if (jobs.length > 0) {
        const logsResp = await fetch(`https://api.github.com/repos/your-repo-owner/your-repo/actions/jobs/${jobs[0].id}/logs`, {
          headers: {
            'Authorization': `Bearer ${githubToken}`,
            'Accept': 'application/vnd.github+json',
          },
        })
        
        if (logsResp.ok) {
          const logsData = await logsResp.json()
          logsUrl = logsUrl || logsResp.url
        }
      }
    }

    // Map job statuses to step names
    const jobSteps = jobs.map((job: any) => ({
      name: job.name,
      status: job.status,
      conclusion: job.conclusion,
      started_at: job.started_at,
      completed_at: job.completed_at,
    }))

    console.log('[qa-status] Run status:', status, 'Jobs:', jobSteps.length)

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
    console.error('[qa-status] Unexpected error', err)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})