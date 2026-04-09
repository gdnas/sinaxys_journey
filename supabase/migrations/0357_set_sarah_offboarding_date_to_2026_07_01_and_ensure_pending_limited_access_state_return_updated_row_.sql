UPDATE public.profiles
SET offboarding_scheduled_at = '2026-07-01'::timestamptz,
    offboarding_state = 'PENDING',
    limited_access = true,
    active = false
WHERE email = 'sarah.tartarini@sinaxys.com';

SELECT id, email, active, limited_access, offboarding_state, offboarding_scheduled_at, must_change_password
FROM public.profiles
WHERE email = 'sarah.tartarini@sinaxys.com';