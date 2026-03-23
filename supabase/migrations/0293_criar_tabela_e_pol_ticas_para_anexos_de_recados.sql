-- Criar tabela de anexos de recados
CREATE TABLE IF NOT EXISTS public.company_announcement_attachments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  announcement_id UUID NOT NULL REFERENCES public.company_announcements(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS
ALTER TABLE public.company_announcement_attachments ENABLE ROW LEVEL SECURITY;

-- Políticas
CREATE POLICY "attachments_select_announcement" ON public.company_announcement_attachments
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.company_announcements a
    WHERE a.id = company_announcement_attachments.announcement_id
    AND is_member_of_company(a.company_id)
  )
);

CREATE POLICY "attachments_insert_author" ON public.company_announcement_attachments
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.company_announcements a
    WHERE a.id = company_announcement_attachments.announcement_id
    AND a.created_by = auth.uid()
  )
);

CREATE POLICY "attachments_delete_author" ON public.company_announcement_attachments
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.company_announcements a
    WHERE a.id = company_announcement_attachments.announcement_id
    AND a.created_by = auth.uid()
  )
);

-- Trigger para updated_at
CREATE TRIGGER set_company_announcement_attachments_updated_at
  BEFORE UPDATE ON public.company_announcement_attachments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();