-- Create helper function to perform scheduled offboarding (cron-style via supervisor) is out-of-scope here.
-- Provide sample SQL to set offboarding_state to COMPLETED when scheduled time has passed (for manual run).

UPDATE public.profiles
SET active = false, offboarding_state = 'COMPLETED', limited_access = false
WHERE offboarding_state = 'PENDING' AND offboarding_scheduled_at IS NOT NULL AND offboarding_scheduled_at <= NOW();

-- Note: In production, run the above periodically (cron or Supabase scheduled job/edge function) to complete the offboarding.
