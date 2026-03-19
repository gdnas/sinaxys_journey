
-- 3. Obter definição das funções de RLS de projects
SELECT 
    pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname IN ('can_view_project', 'can_manage_project')
ORDER BY proname;
