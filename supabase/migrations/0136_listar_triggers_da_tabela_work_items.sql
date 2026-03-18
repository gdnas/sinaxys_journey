-- PASSO 1: Inspecionar triggers de work_items
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing,
  action_condition
FROM information_schema.triggers
WHERE event_object_table = 'work_items'
ORDER BY event_manipulation, action_timing;