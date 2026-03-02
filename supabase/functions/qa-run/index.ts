// @ts-nocheck
/// <reference types="https://deno.land/std@0.190.0/http/server.ts" />
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// In-memory rate limiting (simple approach)
const recentRuns = new Map<string, number>()
const RATE_LIMIT_MS = 60000 // 1 minute

interface GitHubWorkflowDispatchResponse {
  id: number
  name: string
  html_url: string
  status: string
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders })
  }

  try {
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
      return new Response('Forbidden: Only MASTERADMIN can trigger QA', { status: 403, headers: corsHeaders })
    }

    // Rate limiting check
    const now = Date.now()
    const lastRun = recentRuns.get(userId)
    if (lastRun && (now - lastRun) < RATE_LIMIT_MS) {
      return new Response('Too many requests: Please wait before triggering another QA run', { status: 429, headers: corsHeaders })
    }
    recentRuns.set(userId, now)

    // Clean up old entries (keep only last 100 entries)
    if (recentRuns.size > 100) {
      const oldestKey = Array.from(recentRuns.keys())[0]
      recentRuns.delete(oldestKey)
    }

    // Trigger GitHub workflow
    const githubToken = Deno.env.get('GITHUB_TOKEN')
    if (!githubToken) {
      console.error('[qa-run] GITHUB_TOKEN not configured')
      return new Response('Server configuration error', { status: 500, headers: corsHeaders })
    }

    const workflowResp = await fetch('https://api.github.com/repos/your-repo-owner/your-repo/actions/workflows/qa_on_demand.yml/dispatches', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github+json',
        'User-Agent': 'Supabase-Edge-Function',
      },
      body: JSON.stringify({
        ref: 'main',
        inputs: {
          trigger_user: userId,
          trigger_source: 'web',
        },
      }),
    })

    if (!workflowResp.ok) {
      const errorText = await workflowResp.text()
      console.error('[qa-run] Failed to trigger workflow:', errorText)
      return new Response('Failed to trigger QA workflow', { status: 500, headers: corsHeaders })
    }

    // Wait a moment for run to be created
    await new Promise(resolve => setTimeout(resolve, 2000))

    // Get workflow run ID
    const runsResp = await fetch(`https://api.github.com/repos/your-repo-owner/your-repo/actions/workflows/qa_on_demand.yml/runs?per_page=1`, {
      headers: {
        'Authorization': `Bearer ${githubToken}`,
        'Accept': 'application/vnd.github+json',
      },
    })

    if (!runsResp.ok) {
      console.error('[qa-run] Failed to fetch run ID')
      return new Response('Failed to fetch run information', { status: 500, headers: corsHeaders })
    }

    const runsData = await runsResp.json() as { workflow_runs: any[] }
    const latestRun = runsData.workflow_runs[0]

    if (!latestRun) {
      return new Response('Failed to get run ID', { status: 500, headers: corsHeaders })
    }

    console.log('[qa-run] Workflow triggered successfully:', latestRun.id)

    return new Response(JSON.stringify({
      runId: latestRun.id.toString(),
      status: latestRun.status,
      htmlUrl: latestRun.html_url,
      createdAt: latestRun.created_at,
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json',
      },
    })
  } catch (err) {
    console.error('[qa-run] Unexpected error', err)
    return new Response('Internal server error', { status: 500, headers: corsHeaders })
  }
})