
-- ============================================================================
-- Teste da RPC: buscar work_items de um usuário de teste
-- ============================================================================

-- Primeiro, encontrar um usuário com work_items
SELECT 
  u.id as test_user_id,
  u.name as test_user_name,
  COUNT(wi.id) as work_item_count
FROM public.profiles u
INNER JOIN public.work_items wi 
  ON wi.assignee_user_id = u.id
GROUP BY u.id, u.name
LIMIT 1;
