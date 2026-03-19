
-- ============================================
-- VERIFICAÇÃO: Verificar se há work_items com key_result_id
-- ============================================
SELECT 
  COUNT(*) as total_work_items,
  COUNT(CASE WHEN key_result_id IS NOT NULL THEN 1 END) as com_key_result_id
FROM work_items;
