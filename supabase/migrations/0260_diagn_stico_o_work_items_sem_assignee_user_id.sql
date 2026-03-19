
-- ============================================
-- DIAGNÓSTICO O: Verificar work_items sem assignee_user_id
-- ============================================
-- Distribuição de work_items com/sem assignee
SELECT 
  'DIAGNÓSTICO O' as diagnostico,
  'Work_items com assignee_user_id' as descricao,
  COUNT(*) as total_work_items,
  COUNT(CASE WHEN assignee_user_id IS NOT NULL THEN 1 END) as com_assignee,
  COUNT(CASE WHEN assignee_user_id IS NULL THEN 1 END) as sem_assignee,
  ROUND(COUNT(CASE WHEN assignee_user_id IS NULL THEN 1 END) * 100.0 / COUNT(*), 2) as porcentagem_sem_assignee
FROM work_items;
