ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS offboarding_state TEXT DEFAULT 'NONE',
ADD COLUMN IF NOT EXISTS offboarding_scheduled_at TIMESTAMP WITH TIME ZONE NULL,
ADD COLUMN IF NOT EXISTS limited_access BOOLEAN DEFAULT FALSE;

-- Ensure RLS is still enabled (it is) and no extra policies are required because existing select/update policies use company/admin checks and auth.uid() checks.
