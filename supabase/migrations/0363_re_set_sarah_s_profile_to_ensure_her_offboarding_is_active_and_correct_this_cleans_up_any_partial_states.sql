UPDATE public.profiles
SET
    offboarding_state = 'PENDING',
    limited_access = true,
    offboarding_scheduled_at = '2026-07-01',
    active = false
WHERE email = 'sarah.tartarini@sinaxys.com';