-- Verificar a função de log
SELECT pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname = 'log_work_item_event';