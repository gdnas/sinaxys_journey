import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return new Response('Unauthorized', {
      status: 401,
      headers: corsHeaders
    })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  try {
    const body = await req.json()
    const { action, payload } = body

    console.log('[notifications-internal-communication] Processing action:', action)

    switch (action) {
      case 'announcement_published':
        await handleAnnouncementPublished(supabase, payload)
        break
      case 'birthday_today':
        await handleBirthdayToday(supabase, payload)
        break
      case 'birthday_comment':
        await handleBirthdayComment(supabase, payload)
        break
      default:
        return new Response('Invalid action', {
          status: 400,
          headers: corsHeaders
        })
    }

    return new Response(
      JSON.stringify({ success: true }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[notifications-internal-communication] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function handleAnnouncementPublished(supabase: any, payload: any) {
  const { announcementId, companyId, scope, teamId, title } = payload

  console.log('[notifications-internal-communication] announcement_published', { announcementId, companyId, scope, teamId })

  let userIds: string[] = []

  if (scope === 'company') {
    // Get all active company members
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('company_id', companyId)
      .eq('active', true)

    userIds = (profiles ?? []).map((p: any) => p.id)
  } else if (scope === 'team' && teamId) {
    // Get all team members
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id')
      .eq('company_id', companyId)
      .eq('department_id', teamId)
      .eq('active', true)

    userIds = (profiles ?? []).map((p: any) => p.id)
  }

  // Create notifications for all eligible users
  for (const userId of userIds) {
    await supabase.rpc('create_notification', {
      p_user_id: userId,
      p_title: scope === 'company' ? 'Novo recado da empresa' : 'Novo recado para o seu time',
      p_content: title,
      p_href: `/announcements/${announcementId}`,
      p_notif_type: 'announcement_published',
    })
  }

  console.log('[notifications-internal-communication] Created', userIds.length, 'notifications')
}

async function handleBirthdayToday(supabase: any, payload: any) {
  const { companyId, employeeName, eventId } = payload

  console.log('[notifications-internal-communication] birthday_today', { companyId, employeeName })

  // Get all active company members (excluding the birthday person)
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id')
    .eq('company_id', companyId)
    .eq('active', true)

  const userIds = (profiles ?? []).map((p: any) => p.id)

  // Create notifications for all company members
  for (const userId of userIds) {
    await supabase.rpc('create_notification', {
      p_user_id: userId,
      p_title: 'Aniversário do dia',
      p_content: `Hoje é aniversário de ${employeeName}. Deixe uma mensagem! 🎉`,
      p_href: `/`, // Will open the birthday panel
      p_notif_type: 'birthday_today',
    })
  }

  console.log('[notifications-internal-communication] Created', userIds.length, 'birthday notifications')
}

async function handleBirthdayComment(supabase: any, payload: any) {
  const { eventId, authorUserId, authorName, companyId } = payload

  console.log('[notifications-internal-communication] birthday_comment', { eventId, authorUserId })

  // Get the birthday event
  const { data: event } = await supabase
    .from('birthday_events')
    .select('employee_id')
    .eq('id', eventId)
    .single()

  if (!event) {
    console.warn('[notifications-internal-communication] Event not found:', eventId)
    return
  }

  // Notify the birthday person if they're not the author
  if (event.employee_id !== authorUserId) {
    await supabase.rpc('create_notification', {
      p_user_id: event.employee_id,
      p_title: 'Nova mensagem de parabéns',
      p_content: `${authorName} deixou uma mensagem para você!`,
      p_href: `/`,
      p_notif_type: 'birthday_comment',
    })
  }

  // Get all comment authors for this event (to notify them of new comment)
  const { data: comments } = await supabase
    .from('birthday_comments')
    .select('author_user_id')
    .eq('birthday_event_id', eventId)
    .is('deleted_at', null)

  const notifiedUsers = new Set<string>()
  if (event.employee_id !== authorUserId) {
    notifiedUsers.add(event.employee_id)
  }

  for (const comment of (comments ?? [])) {
    const userId = comment.author_user_id
    if (userId !== authorUserId && !notifiedUsers.has(userId)) {
      await supabase.rpc('create_notification', {
        p_user_id: userId,
        p_title: 'Nova mensagem no aniversário',
        p_content: `${authorName} também deixou uma mensagem!`,
        p_href: `/`,
        p_notif_type: 'birthday_comment',
      })
      notifiedUsers.add(userId)
    }
  }

  console.log('[notifications-internal-communication] Notified', notifiedUsers.size, 'users')
}
