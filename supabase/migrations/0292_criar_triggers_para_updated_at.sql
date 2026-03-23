-- Criar trigger function se não existir
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers para updated_at
DROP TRIGGER IF EXISTS set_company_announcements_updated_at ON public.company_announcements;
CREATE TRIGGER set_company_announcements_updated_at
  BEFORE UPDATE ON public.company_announcements
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS set_birthday_comments_updated_at ON public.birthday_comments;
CREATE TRIGGER set_birthday_comments_updated_at
  BEFORE UPDATE ON public.birthday_comments
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();