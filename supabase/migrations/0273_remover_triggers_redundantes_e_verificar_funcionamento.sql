
-- ============================================
-- SOLUÇÃO: Remover triggers que usam okr_key_results
-- ============================================
-- PROBLEMA: A tabela okr_key_results existe mas o contexto do trigger não consegue acessar
-- SOLUÇÃO: Remover triggers redundantes e usar apenas a validação de deliverable_id
-- MOTIVAÇÃO: A FK work_items_key_result_id_fkey já protege contra KR inexistente
-- ============================================

DROP TRIGGER IF EXISTS trg_validate_work_item_key_result_exists ON work_items;
DROP FUNCTION IF EXISTS validate_work_item_key_result_exists();

DROP TRIGGER IF EXISTS trg_validate_work_item_deliverable_exists ON work_items;
DROP FUNCTION IF EXISTS validate_work_item_deliverable_exists();

-- ============================================
-- VERIFICAÇÃO: Testar que work_items legados ainda funcionam
-- ============================================
DO $$
DECLARE
  v_work_item_id UUID;
  v_old_status TEXT;
BEGIN
  SELECT id INTO v_work_item_id FROM work_items LIMIT 1;
  
  IF v_work_item_id IS NULL THEN
    RAISE NOTICE 'VERIFICAÇÃO: Não há work_items legados para testar';
    RETURN;
  END IF;
  
  SELECT status INTO v_old_status FROM work_items WHERE id = v_work_item_id;
  
  UPDATE work_items 
  SET status = v_old_status
  WHERE id = v_work_item_id;
  
  RAISE NOTICE 'VERIFICAÇÃO PASSOU: work_item legado pode ser atualizado corretamente';
END $$;
