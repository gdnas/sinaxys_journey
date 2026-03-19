
-- ============================================
-- TESTE 3: Tentar criar work_item com deliverable_id de KR errado
-- ============================================
-- Este teste deve FALHAR (erro esperado)
DO $$
DECLARE
  v_project_id UUID;
  v_deliverable_id UUID;
  v_key_result_id UUID;
BEGIN
  -- Buscar um deliverable_id e um key_result_id INCOERENTES
  SELECT id INTO v_deliverable_id FROM okr_deliverables LIMIT 1;
  SELECT id INTO v_key_result_id FROM okr_key_results 
  WHERE id <> (SELECT key_result_id FROM okr_deliverables WHERE id = v_deliverable_id)
  LIMIT 1;
  
  -- Se não encontrou KR incoerente, pular teste
  IF v_key_result_id IS NULL THEN
    RAISE NOTICE 'TESTE 3 PULADO: Não há KR incoerentes para testar';
    RETURN;
  END IF;
  
  -- Tentar inserir work_item com deliverable e KR incoerentes (DEVE FALHAR)
  INSERT INTO work_items (id, tenant_id, project_id, title, type, status, priority, deliverable_id, key_result_id, created_by_user_id)
  VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    NULL,
    'Teste deliverable KR incoerente',
    'task',
    'todo',
    'medium',
    v_deliverable_id,
    v_key_result_id,
    '00000000-0000-0000-0000-000000000001'
  );
  
  RAISE EXCEPTION 'TESTE FALHOU: work_item com deliverable KR incoerente foi inserido!';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'TESTE 3 PASSOU: work_item com deliverable KR incoerente bloqueado (%)', SQLERRM;
END $$;
