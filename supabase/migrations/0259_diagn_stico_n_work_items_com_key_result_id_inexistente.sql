
-- ============================================
-- DIAGNÓSTICO N: Verificar integridade referencial de key_result
-- ============================================
-- Work_items com key_result_id que não existe na tabela okr_key_results
SELECT 
  'DIAGNÓSTICO N' as diagnostico,
  'Work_items com key_result_id inexistente' as descricao,
  COUNT(*) as work_items_com_kr_invalido
FROM work_items wi
WHERE wi.key_result_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM okr_key_results k WHERE k.id = wi.key_result_id);
