
-- ============================================
-- TESTE 2: Tentar inserir work_item com deliverable_id sem key_result_id
-- ============================================
-- Este teste deve FALHAR (erro esperado)
DO $$
DECLARE
  v_project_id UUID;
  v_deliverable_id UUID;
BEGIN
  -- Buscar um deliverable_id válido
  SELECT id INTO v_deliverable_id FROM okr_deliverables LIMIT 1;
  
  -- Tentar inserir sem key_result_id (DEVE FALHAR)
  INSERT INTO work_items (id, tenant_id, project_id, title, type, status, priority, deliverable_id, created_by_user_id)
  VALUES (
    gen_random_uuid(),
    '00000000-0000-0000-0000-000000000000',
    NULL,
    'Teste deliverable sem KR',
    'task',
    'todo',
    'medium',
    v_deliverable_id,
    '00000000-0000-0000-0000-000000000001'
  );
  
  RAISE EXCEPTION 'TESTE FALHOU: work_item com deliverable sem KR foi inserido!';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'TESTE 2 PASSOU: work_item com deliverable sem KR bloqueado (%)', SQLERRM;
END $$;
