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
    console.log('[process-birthdays] Starting birthday processing')

    // Get today's date
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0] // YYYY-MM-DD

    // Get all active users with birth dates
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, company_id, name, birth_date')
      .eq('active', true)
      .not('birth_date', 'is', null)

    if (profilesError) {
      throw new Error(`Failed to fetch profiles: ${profilesError.message}`)
    }

    if (!profiles || profiles.length === 0) {
      console.log('[process-birthdays] No profiles with birth dates found')
      return new Response(
        JSON.stringify({ success: true, processed: 0 }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let processedCount = 0

    for (const profile of profiles) {
      if (!profile.birth_date || !profile.company_id) continue

      const birthDate = new Date(profile.birth_date)
      const birthMonth = birthDate.getMonth() + 1
      const birthDay = birthDate.getDate()

      const todayMonth = today.getMonth() + 1
      const todayDay = today.getDate()

      // Check if today is the birthday
      if (birthMonth === todayMonth && birthDay === todayDay) {
        console.log('[process-birthdays] Found birthday:', profile.name)

        // Check if event already exists
        const { data: existingEvent } = await supabase
          .from('birthday_events')
          .select('id')
          .eq('company_id', profile.company_id)
          .eq('employee_id', profile.id)
          .eq('event_date', todayStr)
          .maybeSingle()

        if (!existingEvent) {
          // Create birthday event
          const { error: eventError } = await supabase
            .from('birthday_events')
            .insert({
              company_id: profile.company_id,
              employee_id: profile.id,
              event_date: todayStr,
            })

          if (eventError) {
            console.error('[process-birthdays] Failed to create event:', eventError)
            continue
          }

          console.log('[process-birthdays] Created birthday event for:', profile.name)

          // Send birthday notification
          try {
            await supabase.functions.invoke('notifications-internal-communication', {
              body: {
                action: 'birthday_today',
                payload: {
                  companyId: profile.company_id,
                  employeeName: profile.name,
                  eventId: profile.id,
                },
              },
            })
            console.log('[process-birthdays] Sent notification for:', profile.name)
          } catch (notifError) {
            console.error('[process-birthdays] Failed to send notification:', notifError)
          }

          processedCount++
        } else {
          console.log('[process-birthdays] Event already exists for:', profile.name)
        }
      }
    }

    console.log('[process-birthdays] Completed. Processed:', processedCount)

    return new Response(
      JSON.stringify({ success: true, processed: processedCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('[process-birthdays] Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
