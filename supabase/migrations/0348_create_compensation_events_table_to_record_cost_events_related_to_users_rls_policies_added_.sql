-- Create compensation_events table to register cost events (keeps RLS enabled and policies per tenant)

CREATE TABLE IF NOT EXISTS public.compensation_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  monthly_cost_brl numeric,
  effective_at timestamp with time zone NOT NULL,
  created_at timestamp with time zone DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

ALTER TABLE public.compensation_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY compensation_events_select_tenant ON public.compensation_events
  FOR SELECT TO authenticated USING (company_id = current_setting('jwt.claims.company_id')::uuid);

CREATE POLICY compensation_events_insert_tenant ON public.compensation_events
  FOR INSERT TO authenticated WITH CHECK (company_id = current_setting('jwt.claims.company_id')::uuid AND auth.uid() = created_by);

CREATE POLICY compensation_events_update_tenant ON public.compensation_events
  FOR UPDATE TO authenticated USING (company_id = current_setting('jwt.claims.company_id')::uuid AND auth.uid() = created_by);

CREATE POLICY compensation_events_delete_tenant ON public.compensation_events
  FOR DELETE TO authenticated USING (company_id = current_setting('jwt.claims.company_id')::uuid AND auth.uid() = created_by);
