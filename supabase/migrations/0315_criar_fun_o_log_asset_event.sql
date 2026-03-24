-- =====================================================
-- FUNÇÃO: Logar evento de ativo
-- =====================================================
CREATE OR REPLACE FUNCTION log_asset_event(
  p_asset_id UUID,
  p_event_type asset_event_type,
  p_title TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_assignment_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'::jsonb,
  p_actor_user_id UUID DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_tenant_id UUID;
  v_event_id UUID;
BEGIN
  -- Obter tenant_id do ativo
  SELECT tenant_id INTO v_tenant_id FROM public.assets WHERE id = p_asset_id;
  
  -- Se não informado, usar o usuário atual como actor
  IF p_actor_user_id IS NULL THEN
    p_actor_user_id := auth.uid();
  END IF;
  
  -- Inserir evento
  INSERT INTO public.asset_events (
    tenant_id,
    asset_id,
    assignment_id,
    event_type,
    title,
    description,
    metadata,
    actor_user_id,
    event_date
  ) VALUES (
    v_tenant_id,
    p_asset_id,
    p_assignment_id,
    p_event_type,
    p_title,
    p_description,
    p_metadata,
    p_actor_user_id,
    NOW()
  ) RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

COMMIT;