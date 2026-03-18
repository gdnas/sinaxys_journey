-- Verificar triggers que podem estar deletando work_items
SELECT trigger_name, event_manipulation, event_object_table, action_statement
FROM information_schema.triggers
WHERE event_object_table = 'work_items'
  AND event_manipulation = 'DELETE';