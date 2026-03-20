-- Create feedback_shares table and RLS policies
CREATE TABLE IF NOT EXISTS public.feedback_shares (
  feedback_id UUID PRIMARY KEY REFERENCES public.feedbacks(id) ON DELETE CASCADE,
  public BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.feedback_shares ENABLE ROW LEVEL SECURITY;

-- Remove existing policies if any
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_policiess WHERE FALSE) THEN
    -- no-op to satisfy some linters
    NULL;
  END IF;
EXCEPTION WHEN undefined_table THEN
  -- ignore
  NULL;
END $$;

-- Create policies
DROP POLICY IF EXISTS feedback_shares_public_select ON public.feedback_shares;
CREATE POLICY feedback_shares_public_select ON public.feedback_shares
  FOR SELECT USING (public = true);

DROP POLICY IF EXISTS feedback_shares_recipient_select ON public.feedback_shares;
CREATE POLICY feedback_shares_recipient_select ON public.feedback_shares
  FOR SELECT TO authenticated USING (auth.uid() = (SELECT to_user_id FROM public.feedbacks WHERE id = feedback_shares.feedback_id));

DROP POLICY IF EXISTS feedback_shares_recipient_insert ON public.feedback_shares;
CREATE POLICY feedback_shares_recipient_insert ON public.feedback_shares
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = (SELECT to_user_id FROM public.feedbacks WHERE id = feedback_shares.feedback_id));

DROP POLICY IF EXISTS feedback_shares_recipient_update ON public.feedback_shares;
CREATE POLICY feedback_shares_recipient_update ON public.feedback_shares
  FOR UPDATE TO authenticated USING (auth.uid() = (SELECT to_user_id FROM public.feedbacks WHERE id = feedback_shares.feedback_id)) WITH CHECK (auth.uid() = (SELECT to_user_id FROM public.feedbacks WHERE id = feedback_shares.feedback_id));

DROP POLICY IF EXISTS feedback_shares_recipient_delete ON public.feedback_shares;
CREATE POLICY feedback_shares_recipient_delete ON public.feedback_shares
  FOR DELETE TO authenticated USING (auth.uid() = (SELECT to_user_id FROM public.feedbacks WHERE id = feedback_shares.feedback_id));
