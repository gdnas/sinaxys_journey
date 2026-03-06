-- Migration: Create tables for deliverable attachments and comments
-- This migration adds support for attachments (links, documents, files) and comments on deliverables

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

-- Enable Row Level Security (RLS) for attachments
ALTER TABLE public.okr_deliverable_attachments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for attachments
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
          WHERE kr.id = d.key_result_id
          AND kr.owner_user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
          AND p.role IN ('ADMIN', 'MASTERADMIN')
        )
      )
    )
  );

-- Users can create attachments on deliverables they own or are admins
CREATE POLICY "attachments_insert_policy" ON public.okr_deliverable_attachments
  FOR INSERT TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.okr_deliverables d
      WHERE d.id = okr_deliverable_attachments.deliverable_id
      AND (
        d.owner_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
          AND p.role IN ('ADMIN', 'MASTERADMIN')
        )
      )
    )
  );

-- Users can update their own attachments or if they are admins
CREATE POLICY "attachments_update_policy" ON public.okr_deliverable_attachments
  FOR UPDATE TO authenticated
  USING (
    okr_deliverable_attachments.created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('ADMIN', 'MASTERADMIN')
    )
  );

-- Users can delete their own attachments or if they are admins
CREATE POLICY "attachments_delete_policy" ON public.okr_deliverable_attachments
  FOR DELETE TO authenticated
  USING (
    okr_deliverable_attachments.created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('ADMIN', 'MASTERADMIN')
    )
  );

-- Enable Row Level Security (RLS) for comments
ALTER TABLE public.okr_deliverable_comments ENABLE ROW LEVEL SECURITY;

-- RLS Policies for comments
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
          WHERE kr.id = d.key_result_id
          AND kr.owner_user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
          AND p.role IN ('ADMIN', 'MASTERADMIN')
        )
      )
    )
  );

-- Users can create comments on deliverables they have access to
CREATE POLICY "comments_insert_policy" ON public.okr_deliverable_comments
  FOR INSERT TO authenticated
  WITH CHECK (
    okr_deliverable_comments.created_by = auth.uid()
    AND EXISTS (
      SELECT 1 FROM public.okr_deliverables d
      WHERE d.id = okr_deliverable_comments.deliverable_id
      AND (
        d.owner_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM public.okr_key_results kr
          WHERE kr.id = d.key_result_id
          AND kr.owner_user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM public.profiles p
          WHERE p.id = auth.uid()
          AND p.role IN ('ADMIN', 'MASTERADMIN')
        )
      )
    )
  );

-- Users can update their own comments or if they are admins
CREATE POLICY "comments_update_policy" ON public.okr_deliverable_comments
  FOR UPDATE TO authenticated
  USING (
    okr_deliverable_comments.created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('ADMIN', 'MASTERADMIN')
    )
  );

-- Users can delete their own comments or if they are admins
CREATE POLICY "comments_delete_policy" ON public.okr_deliverable_comments
  FOR DELETE TO authenticated
  USING (
    okr_deliverable_comments.created_by = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
      AND p.role IN ('ADMIN', 'MASTERADMIN')
    )
  );

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_deliverable_attachments_deliverable_id ON public.okr_deliverable_attachments(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_deliverable_attachments_created_by ON public.okr_deliverable_attachments(created_by);
CREATE INDEX IF NOT EXISTS idx_deliverable_attachments_type ON public.okr_deliverable_attachments(type);
CREATE INDEX IF NOT EXISTS idx_deliverable_comments_deliverable_id ON public.okr_deliverable_comments(deliverable_id);
CREATE INDEX IF NOT EXISTS idx_deliverable_comments_created_by ON public.okr_deliverable_comments(created_by);

-- Create trigger to update updated_at timestamp for attachments
CREATE OR REPLACE FUNCTION update_deliverable_attachments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_deliverable_attachments_updated_at
  BEFORE UPDATE ON public.okr_deliverable_attachments
  FOR EACH ROW
  EXECUTE FUNCTION update_deliverable_attachments_updated_at();

-- Create trigger to update updated_at timestamp for comments
CREATE OR REPLACE FUNCTION update_deliverable_comments_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_deliverable_comments_updated_at
  BEFORE UPDATE ON public.okr_deliverable_comments
  FOR EACH ROW
  EXECUTE FUNCTION update_deliverable_comments_updated_at();