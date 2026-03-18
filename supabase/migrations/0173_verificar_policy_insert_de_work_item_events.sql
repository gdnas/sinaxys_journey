-- Verificar a policy events_insert_policy em detalhes
SELECT 
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'work_item_events'
  AND cmd = 'INSERT';