
-- 2. Verificar se há triggers que criam notificações
SELECT 
    trigger_name,
    event_object_table,
    action_statement
FROM information_schema.triggers 
WHERE event_object_schema = 'public' 
  AND (event_object_table = 'work_items' OR event_object_table = 'comments');
