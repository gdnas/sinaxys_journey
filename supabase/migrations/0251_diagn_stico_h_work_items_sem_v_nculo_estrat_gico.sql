
-- ============================================
-- DIAGNÓSTICO H: work_items sem vínculo estratégico
-- ============================================
-- Verificar work_items sem project_id, key_result_id ou deliverable_id
SELECT 
  'DIAGNÓSTICO H' as diagnostico,
  'Work_items sem vínculo estratégico' as descricao,
  COUNT(*) as total_work_items,
  COUNT(CASE WHEN project_id IS NULL THEN 1 END) as sem_projeto,
  COUNT(CASE WHEN key_result_id IS NULL AND deliverable_id IS NULL THEN 1 END) as sem_vinculo_estrategico,
  COUNT(CASE WHEN project_id IS NULL AND key_result_id IS NULL AND deliverable_id IS NULL THEN 1 END) as sem_vinculo_algum
FROM work_items;
