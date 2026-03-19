
-- ============================================
-- DIAGNÓSTICO C: Coerência entre deliverable_id e key_result_id
-- ============================================
-- Verificar work_items com deliverable_id mas sem key_result_id
SELECT 
  'DIAGNÓSTICO C' as diagnostico,
  'Work_items com deliverable_id sem key_result_id' as descricao,
  COUNT(*) as work_items_com_deliverable_sem_kr
FROM work_items
WHERE deliverable_id IS NOT NULL AND key_result_id IS NULL;
