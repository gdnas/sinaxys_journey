-- Verificar se okr_tasks tem triggers
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing,
  action_condition
FROM information_schema.triggers
WHERE event_object_table = 'okr_tasks';