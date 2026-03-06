-- Migration: Deliverable Attachments and Comments
-- Description: Add support for attachments (links, documents, files) and comments on deliverables

-- Create table for deliverable attachments
CREATE TABLE IF NOT EXISTS public.okr_deliverable_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deliverable_id UUID NOT NULL REFERENCES public.okr_deliverables(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN ('LINK', 'DOCUMENT', 'FILE')),
  url TEXT,
  description TEXT,
  file_name TEXT,
  file_size BIGINT,
  file_type TEXT,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create table for deliverable comments
CREATE TABLE IF NOT EXISTS public.okr_deliverable_comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  deliverable_id UUID NOT NULL REFERENCES public.okr_deliverables(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable Row Level Security
ALTER TABLE public.okr_deliverable_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.okr_deliverable_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for deliverable_attachments
-- Users can read attachments of deliverables they have access to
CREATE POLICY "attachments_read_policy" ON public.okr_deliverable_attachments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.okr_deliverables d
      WHERE d.id = okr_deliverable_attachments.deliverable_id
      AND (
        d.owner_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.okr_key_results kr
          JOIN public.okr_objectives o ON kr.objective_id = o.id
          WHERE kr.id = d.key_result_id
          AND o.owner_user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.okr_key_results kr
          JOIN public.okr_objectives o ON kr.objective_id = o.id
          WHERE kr.id = d.key_result_id
          AND o.moderator_user_id = auth.uid()
        )
      )
    )
  );

-- Users can create attachments on deliverables they have access to
CREATE POLICY "attachments_insert_policy" ON public.okr_deliverable_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.okr_deliverables d
      WHERE d.id = okr_deliverable_attachments.deliverable_id
      AND (
        d.owner_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.okr_key_results kr
          JOIN public.okr_objectives o ON kr.objective_id = o.id
          WHERE kr.id = d.key_result_id
          AND o.owner_user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.okr_key_results kr
          JOIN public.okr_objectives o ON kr.objective_id = o.id
          WHERE kr.id = d.key_result_id
          AND o.moderator_user_id = auth.uid()
        )
      )
    )
  );

-- Users can update their own attachments
CREATE POLICY "attachments_update_policy" ON public.okr_deliverable_attachments
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

-- Users can delete their own attachments
CREATE POLICY "attachments_delete_policy" ON public.okr_deliverable_attachments
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- RLS Policies for deliverable_comments
-- Users can read comments of deliverables they have access to
CREATE POLICY "comments_read_policy" ON public.okr_deliverable_comments
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.okr_deliverables d
      WHERE d.id = okr_deliverable_comments.deliverable_id
      AND (
        d.owner_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.okr_key_results kr
          JOIN public.okr_objectives o ON kr.objective_id = o.id
          WHERE kr.id = d.key_result_id
          AND o.owner_user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.okr_key_results kr
          JOIN public.okr_objectives o ON kr.objective_id = o.id
          WHERE kr.id = d.key_result_id
          AND o.moderator_user_id = auth.uid()
        )
      )
    )
  );

-- Users can create comments on deliverables they have access to
CREATE POLICY "comments_insert_policy" ON public.okr_deliverable_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.okr_deliverables d
      WHERE d.id = okr_deliverable_comments.deliverable_id
      AND (
        d.owner_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.okr_key_results kr
          JOIN public.okr_objectives o ON kr.objective_id = o.id
          WHERE kr.id = d.key_result_id
          AND o.owner_user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.okr_key_results kr
          JOIN public.okr_objectives o ON kr.objective_id = o.id
          WHERE kr.id = d.key_result_id
          AND o.moderator_user_id = auth.uid()
        )
      )
    )
  );

-- Users can update their own comments
CREATE POLICY "comments_update_policy" ON public.okr_deliverable_comments
  FOR UPDATE TO authenticated
  USING (created_by = auth.uid());

-- Users can delete their own comments
CREATE POLICY "comments_delete_policy" ON public.okr_deliverable_comments
  FOR DELETE TO authenticated
  USING (created_by = auth.uid());

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_deliverable_attachments_deliverable_id ON public.okr_deliverable_attachments(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_deliverable_attachments_created_by ON public.okr_deliverable_attachments(created_by);
CREATE INDEX IF NOT EXISTS idx_deliverable_comments_deliverable_id ON public.okr_deliverable_comments(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_deliverable_comments_created_by ON public.okr_deliverable_comments(created_by);

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_deliverable_attachments_updated_at
  BEFORE UPDATE ON public.okr_deliverable_attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_deliverable_comments_updated_at
  BEFORE UPDATE ON public.okr_deliverable_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();