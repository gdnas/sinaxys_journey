-- Verificar se o trigger existe
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE trigger_name = 'trigger_log_work_item_events';