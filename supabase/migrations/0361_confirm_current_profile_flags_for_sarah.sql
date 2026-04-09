SELECT id, email, active, limited_access, offboarding_state, offboarding_scheduled_at, must_change_password
FROM public.profiles
WHERE email = 'sarah.tartarini@sinaxys.com';