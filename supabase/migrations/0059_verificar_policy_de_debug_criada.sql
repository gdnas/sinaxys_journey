
SELECT 
  policyname,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'work_items'
  AND schemaname = 'public'
  AND policyname LIKE '%debug%'
ORDER BY policyname;
