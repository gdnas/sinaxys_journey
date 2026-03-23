-- ============================================
-- TRIGGER: Resolver inconsistências ao corrigir status
-- ============================================
-- Objetivo: Quando o status de um work_item mudar para um valor válido,
--          resolver todas as inconsistências abertas relacionadas
-- ============================================

-- Recriar trigger set_work_items_updated_at com lógica de resolução
CREATE OR REPLACE FUNCTION set_work_items_updated_at_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- Primeiro, atualizar updated_at
  NEW.updated_at = NOW();
  
  -- Verificar se o NOVO status é válido
  IF NEW.status IN ('backlog', 'todo', 'in_progress', 'blocked', 'done') THEN
    -- Status válido -> resolver inconsistências de status
    -- Resolver todas as inconsistências abertas relacionadas a status
    UPDATE work_item_inconsistencies
    SET resolved_at = NOW()
    WHERE work_item_id = NEW.id
      AND type IN ('invalid_status', 'null_status')
      AND resolved_at IS NULL;
      
    IF FOUND THEN
      RAISE NOTICE '[resolve_inconsistencies] Status corrigido para work_item %. % inconsistências resolvidas',
        NEW.id, ROW_COUNT;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Recriar trigger que usa a função acima
DROP TRIGGER IF EXISTS set_work_items_updated_at ON work_items;
CREATE TRIGGER set_work_items_updated_at
  BEFORE UPDATE ON work_items
  FOR EACH ROW
  EXECUTE FUNCTION set_work_items_updated_at_trigger();

COMMENT ON FUNCTION set_work_items_updated_at_trigger() IS
'Atualiza updated_at e resolve inconsistências quando status é corrigido.

KAIROOS 2.0 Fase 1.5A - Integridade e Monitoramento

Integridade com:
- log_work_item_inconsistency: cria inconsistências quando há problemas
- scan_project_work_items: scan em lote de todos os work_items de um projeto';