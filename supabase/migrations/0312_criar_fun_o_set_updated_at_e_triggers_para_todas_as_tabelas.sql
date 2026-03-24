-- =====================================================
-- TRIGGERS E FUNÇÕES AUXILIARES (PARTE 1)
-- =====================================================

-- Função set_updated_at (se já existe, usar ela)
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Triggers para updated_at
DROP TRIGGER IF EXISTS set_contractor_companies_updated_at ON public.contractor_companies;
CREATE TRIGGER set_contractor_companies_updated_at
  BEFORE UPDATE ON public.contractor_companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_assets_updated_at ON public.assets;
CREATE TRIGGER set_assets_updated_at
  BEFORE UPDATE ON public.assets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_asset_assignments_updated_at ON public.asset_assignments;
CREATE TRIGGER set_asset_assignments_updated_at
  BEFORE UPDATE ON public.asset_assignments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS set_asset_incidents_updated_at ON public.asset_incidents;
CREATE TRIGGER set_asset_incidents_updated_at
  BEFORE UPDATE ON public.asset_incidents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

COMMIT;