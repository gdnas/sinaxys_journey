
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'work_items'
  AND schemaname = 'public'
ORDER BY cmd, policyname;
