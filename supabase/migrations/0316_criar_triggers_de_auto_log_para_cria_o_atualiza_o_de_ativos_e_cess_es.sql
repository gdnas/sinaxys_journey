-- =====================================================
-- TRIGGERS: Auto-log events
-- =====================================================

-- Logar quando um ativo é criado
CREATE OR REPLACE FUNCTION trigger_asset_created_event()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM log_asset_event(
    NEW.id,
    'asset_created'::asset_event_type,
    'Ativo cadastrado',
    CONCAT('Ativo ', NEW.asset_code, ' foi cadastrado no sistema.'),
    NULL,
    jsonb_build_object(
      'asset_code', NEW.asset_code,
      'category', NEW.category::text,
      'brand', NEW.brand,
      'model', NEW.model,
      'purchase_value', NEW.purchase_value
    )::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS trigger_asset_created_event ON public.assets;
CREATE TRIGGER trigger_asset_created_event
  AFTER INSERT ON public.assets
  FOR EACH ROW EXECUTE FUNCTION trigger_asset_created_event();

-- Logar quando um ativo é atualizado (apenas se mudar status ou localização)
CREATE OR REPLACE FUNCTION trigger_asset_updated_event()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM log_asset_event(
    NEW.id,
    'asset_updated'::asset_event_type,
    'Ativo atualizado',
    'Dados do ativo foram modificados.',
    NULL,
    jsonb_build_object(
      'old_status', OLD.status::text,
      'new_status', NEW.status::text,
      'old_location', OLD.current_location,
      'new_location', NEW.current_location
    )::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS trigger_asset_updated_event ON public.assets;
CREATE TRIGGER trigger_asset_updated_event
  AFTER UPDATE ON public.assets
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status OR OLD.current_location IS DISTINCT FROM NEW.current_location)
  EXECUTE FUNCTION trigger_asset_updated_event();

-- Logar quando uma cessão é criada (entrega)
CREATE OR REPLACE FUNCTION trigger_assignment_created_event()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM log_asset_event(
    NEW.asset_id,
    'asset_delivered'::asset_event_type,
    'Ativo entregue',
    CONCAT('Ativo disponibilizado para ', (SELECT name FROM public.profiles WHERE id = NEW.profile_id)),
    NEW.id,
    jsonb_build_object(
      'profile_id', NEW.profile_id,
      'modality', NEW.modality::text,
      'assigned_at', NEW.assigned_at
    )::jsonb
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS trigger_assignment_created_event ON public.asset_assignments;
CREATE TRIGGER trigger_assignment_created_event
  AFTER INSERT ON public.asset_assignments
  FOR EACH ROW
  WHEN (NEW.status = 'active')
  EXECUTE FUNCTION trigger_assignment_created_event();

COMMIT;