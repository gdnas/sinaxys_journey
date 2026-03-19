
-- 8. Verificar função log_comment_event
SELECT 
    pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'log_comment_event';
