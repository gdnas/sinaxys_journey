
-- 4. Verificar triggers existentes na tabela projects
SELECT 
    trigger_name,
    event_manipulation,
    action_timing,
    event_object_table,
    action_statement,
    action_condition
FROM information_schema.triggers 
WHERE event_object_schema = 'public' 
  AND event_object_table = 'projects';
