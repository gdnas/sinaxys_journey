-- Create public RPC and asset_reports table with correct policies and trigger

-- 1) Create asset_reports table
CREATE TABLE IF NOT EXISTS public.asset_reports (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES public.assets(id) ON DELETE CASCADE,
  reporter_name TEXT,
  reporter_phone TEXT,
  reporter_email TEXT,
  location TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.asset_reports ENABLE ROW LEVEL SECURITY;

-- Insert policy: allow anonymous inserts (WITH CHECK is required for INSERT)
DROP POLICY IF EXISTS asset_reports_insert_public ON public.asset_reports;
CREATE POLICY asset_reports_insert_public ON public.asset_reports
  FOR INSERT
  WITH CHECK (true);

-- Select policy: allow public read of reports (if you want to allow it)
DROP POLICY IF EXISTS asset_reports_select_public ON public.asset_reports;
CREATE POLICY asset_reports_select_public ON public.asset_reports
  FOR SELECT
  USING (true);

-- 2) Create RPC to fetch public asset details (SECURITY DEFINER -> bypass RLS)
CREATE OR REPLACE FUNCTION public.get_public_asset(p_asset_id uuid)
RETURNS TABLE(
  id uuid,
  tenant_id uuid,
  asset_code text,
  asset_type text,
  brand text,
  model text,
  serial_number text,
  status text,
  notes text,
  created_at timestamptz,
  company_name text
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT a.id, a.tenant_id, a.asset_code, a.asset_type, a.brand, a.model, a.serial_number, a.status::text, a.notes, a.created_at, c.name
  FROM public.assets a
  LEFT JOIN public.companies c ON c.id = a.tenant_id
  WHERE a.id = p_asset_id;
END;
$$;

-- 3) Notification function and trigger: notify admins on asset_reports insert
CREATE OR REPLACE FUNCTION public.notify_admins_on_asset_report()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER AS $$
DECLARE
  admin_row RECORD;
  asset_code_text TEXT;
  href TEXT;
  content TEXT;
BEGIN
  SELECT asset_code INTO asset_code_text FROM public.assets WHERE id = NEW.asset_id;
  href := '/companies/' || NEW.tenant_id || '/assets/' || NEW.asset_id || '/demo';
  content := 'Relato de perda para o ativo ' || COALESCE(asset_code_text, NEW.asset_id::text) || '. Contato: ' || COALESCE(NEW.reporter_name, '') || ' ' || COALESCE(NEW.reporter_phone, '') || ' ' || COALESCE(NEW.reporter_email, '') || '. Local: ' || COALESCE(NEW.location, 'não informado') || '. Notas: ' || COALESCE(NEW.notes, '');

  FOR admin_row IN
    SELECT id FROM public.profiles WHERE company_id = NEW.tenant_id AND (role = 'ADMIN' OR role = 'MASTERADMIN')
  LOOP
    INSERT INTO public.notifications (user_id, actor_user_id, title, content, href, notif_type)
    VALUES (
      admin_row.id,
      NULL,
      'Relato de perda recebido',
      content,
      href,
      'asset_lost_report'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_admins_on_asset_report ON public.asset_reports;
CREATE TRIGGER trg_notify_admins_on_asset_report
AFTER INSERT ON public.asset_reports
FOR EACH ROW EXECUTE FUNCTION public.notify_admins_on_asset_report();
