
-- 1. Verificar políticas RLS da tabela projects
SELECT 
    policyname,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE schemaname = 'public' 
  AND tablename = 'projects'
ORDER BY cmd, policyname;
