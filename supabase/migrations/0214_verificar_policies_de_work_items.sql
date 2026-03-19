
-- 2. Verificar políticas RLS da tabela work_items
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'work_items'
ORDER BY cmd, policyname;
