
-- 6. Verificar definição da função create_notification
SELECT 
    pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'create_notification';
