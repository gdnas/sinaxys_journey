
-- 4. Obter definição das funções de RLS de work_items
SELECT 
    pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname IN ('can_view_work_item_row', 'can_manage_work_item_row', 'can_create_work_item')
ORDER BY proname;
