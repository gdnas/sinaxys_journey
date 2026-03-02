-- Create user_documents table
CREATE TABLE IF NOT EXISTS public.user_documents (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  category text NOT NULL DEFAULT 'EMPRESA',
  title text NOT NULL,
  kind text NOT NULL DEFAULT 'LINK',
  url text,
  created_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_documents ENABLE ROW LEVEL SECURITY;

-- Policies: allow users to manage their own documents
-- Note: this project's frontend normalizes roles to uppercase (e.g., 'ADMIN', 'HEAD', 'MASTERADMIN').
-- Adjust policies to match auth.role() return values. We'll allow OWNER, ADMIN, HEAD and MASTERADMIN read access.

CREATE POLICY "user_documents_select" ON public.user_documents
  FOR SELECT
  TO authenticated
  USING (
    auth.uid() = user_id OR
    (auth.role() IS NOT NULL AND UPPER(auth.role()) IN ('ADMIN','MASTERADMIN','HEAD'))
  );

-- Allow the document owner OR admins/heads to INSERT rows (so admins/heads can add documents on behalf of users).
DROP POLICY IF EXISTS "user_documents_insert" ON public.user_documents;
CREATE POLICY "user_documents_insert" ON public.user_documents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    auth.uid() = user_id OR
    (auth.role() IS NOT NULL AND UPPER(auth.role()) IN ('ADMIN','MASTERADMIN','HEAD'))
  );

CREATE POLICY "user_documents_update" ON public.user_documents
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id OR (auth.role() IS NOT NULL AND UPPER(auth.role()) IN ('ADMIN','MASTERADMIN')));

CREATE POLICY "user_documents_delete" ON public.user_documents
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id OR (auth.role() IS NOT NULL AND UPPER(auth.role()) IN ('ADMIN','MASTERADMIN')));