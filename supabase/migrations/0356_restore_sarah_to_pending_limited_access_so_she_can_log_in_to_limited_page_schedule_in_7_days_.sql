-- Put Sarah back into PENDING offboarding with limited_access=true so she can login and view minimal page
UPDATE public.profiles
SET offboarding_state = 'PENDING', limited_access = true, offboarding_scheduled_at = NOW() + INTERVAL '7 days', active = false
WHERE email = 'sarah.tartarini@sinaxys.com';

-- Return updated row
SELECT id, email, active, limited_access, offboarding_state, offboarding_scheduled_at, must_change_password
FROM public.profiles
WHERE email = 'sarah.tartarini@sinaxys.com';