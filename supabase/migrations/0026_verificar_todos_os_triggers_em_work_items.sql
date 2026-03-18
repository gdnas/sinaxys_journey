-- Verificar todos os triggers em work_items
SELECT trigger_name, event_manipulation, event_object_table, action_timing, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'work_items'
ORDER BY trigger_name;