-- ============================================
-- FUNÇÃO: log_work_item_inconsistency
-- ============================================
-- Objetivo: Criar inconsistency para um work_item
-- Garantia: Não duplica inconsistências (úNICA inconsistência aberta por tipo por work_item)
-- ============================================

CREATE OR REPLACE FUNCTION log_work_item_inconsistency(
  p_work_item_id uuid,
  p_tenant_id uuid,
  p_type text,
  p_description text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_project_id uuid;
  v_inconsistency_id uuid;
BEGIN
  -- Obter project_id do work_item
  SELECT project_id INTO v_project_id
  FROM work_items
  WHERE id = p_work_item_id;
  
  -- Verificar se JÁ existe inconsistência ABERTA do mesmo tipo para este work_item
  SELECT id INTO v_inconsistency_id
  FROM work_item_inconsistencies
  WHERE work_item_id = p_work_item_id
    AND type = p_type
    AND resolved_at IS NULL;
  
  IF v_inconsistency_id IS NOT NULL THEN
    -- Já existe inconsistência aberta - não duplicar
    RETURN v_inconsistency_id;
  END IF;
  
  -- Criar nova inconsistência
  INSERT INTO work_item_inconsistencies (
    work_item_id,
    tenant_id,
    project_id,
    type,
    description,
    created_at
  )
  VALUES (
    p_work_item_id,
    p_tenant_id,
    v_project_id,
    p_type,
    p_description,
    NOW()
  )
  RETURNING id INTO v_inconsistency_id;
  
  -- Log para debug
  RAISE NOTICE '[log_work_item_inconsistency] Inconsistency criada: work_item=%, type=%, description=%', 
    p_work_item_id, p_type, p_description;
  
  RETURN v_inconsistency_id;
END;
$$;

COMMENT ON FUNCTION log_work_item_inconsistency(
  p_work_item_id uuid,
  p_tenant_id uuid,
  p_type text,
  p_description text
) IS
'Cria inconsistência para work_item.
NÃO duplica se já existe inconsistência aberta do mesmo tipo.

KAIROOS 2.0 Fase 1.5A - Integridade e Diagnóstico

Integridade com:
- scan_project_work_items: scan de todos os work_items de um projeto
- Triggers: validação em tempo real ao modificar work_items';