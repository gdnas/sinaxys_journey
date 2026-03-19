
-- 3. Verificar função de logging de work_items
SELECT 
    pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'log_work_item_event';
