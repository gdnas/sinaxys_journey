-- =====================================================
-- TRIGGER: Logar completamento de cessão (devolução ou aquisição)
-- =====================================================
CREATE OR REPLACE FUNCTION trigger_assignment_completed_event()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'completed' AND OLD.status = 'active' THEN
    PERFORM log_asset_event(
      NEW.asset_id,
      'return_registered'::asset_event_type,
      'Devolução registrada',
      CONCAT('Devolução do ativo por ', (SELECT name FROM public.profiles WHERE id = NEW.profile_id)),
      NEW.id,
      jsonb_build_object(
        'profile_id', NEW.profile_id,
        'returned_at', NEW.returned_at,
        'return_condition', NEW.return_condition::text
      )::jsonb
    );
  ELSIF NEW.acquired_at IS NOT NULL AND OLD.acquired_at IS NULL THEN
    PERFORM log_asset_event(
      NEW.asset_id,
      'acquisition_exercised'::asset_event_type,
      'Aquisição exercida',
      CONCAT('Aquisição do ativo por ', (SELECT name FROM public.profiles WHERE id = NEW.profile_id)),
      NEW.id,
      jsonb_build_object(
        'profile_id', NEW.profile_id,
        'acquired_at', NEW.acquired_at,
        'acquired_value', NEW.acquired_value
      )::jsonb
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS trigger_assignment_completed_event ON public.asset_assignments;
CREATE TRIGGER trigger_assignment_completed_event
  AFTER UPDATE ON public.asset_assignments
  FOR EACH ROW EXECUTE FUNCTION trigger_assignment_completed_event();

-- =====================================================
-- TRIGGER: Atualizar status do ativo baseado em cessão
-- =====================================================
CREATE OR REPLACE FUNCTION update_asset_status_on_assignment()
RETURNS TRIGGER AS $$
BEGIN
  -- Ao criar cessão ativa: marcar ativo como em uso
  IF TG_OP = 'INSERT' AND NEW.status = 'active' THEN
    UPDATE public.assets 
    SET status = 'in_use'
    WHERE id = NEW.asset_id;
  
  -- Ao completar cessão: verificar se há outras ativas
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'active' AND NEW.status = 'completed' THEN
    UPDATE public.assets 
    SET status = 
      CASE 
        WHEN NEW.return_condition = 'damaged' THEN 'in_maintenance'
        WHEN EXISTS (
          SELECT 1 FROM public.asset_assignments 
          WHERE asset_id = NEW.asset_id AND status = 'active' AND id != NEW.id
        ) THEN 'in_use'
        ELSE 'returned'
      END
    WHERE id = NEW.asset_id;
    
  -- Ao exercer aquisição: marcar como adquirido
  ELSIF TG_OP = 'UPDATE' AND NEW.acquired_at IS NOT NULL AND OLD.acquired_at IS NULL THEN
    UPDATE public.assets 
    SET status = 'acquired_by_user'
    WHERE id = NEW.asset_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

DROP TRIGGER IF EXISTS trigger_update_asset_status ON public.asset_assignments;
CREATE TRIGGER trigger_update_asset_status
  AFTER INSERT OR UPDATE ON public.asset_assignments
  FOR EACH ROW EXECUTE FUNCTION update_asset_status_on_assignment();

COMMIT;