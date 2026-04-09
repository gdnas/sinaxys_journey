-- Create audit_logs table with RLS and policies
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  actor_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  target_user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  action TEXT NOT NULL,
  meta JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to insert logs for their company and with themselves as actor
CREATE POLICY audit_logs_insert ON public.audit_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    (company_id = current_setting('jwt.claims.company_id')::uuid)
    AND (actor_user_id = auth.uid())
  );

-- Allow admins and masteradmin to select logs for their company
CREATE POLICY audit_logs_select_admin ON public.audit_logs
  FOR SELECT TO authenticated
  USING (company_id = current_setting('jwt.claims.company_id')::uuid AND is_admin_of_company(company_id));

-- Allow actors to select their own logs
CREATE POLICY audit_logs_select_actor ON public.audit_logs
  FOR SELECT TO authenticated
  USING (company_id = current_setting('jwt.claims.company_id')::uuid AND actor_user_id = auth.uid());
