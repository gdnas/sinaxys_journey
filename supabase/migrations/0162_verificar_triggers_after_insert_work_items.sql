-- Verificar triggers AFTER INSERT em work_items (estes podem estar falhando e causar o erro 55000)
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'work_items'
  AND event_manipulation = 'INSERT'
  AND action_timing = 'AFTER';