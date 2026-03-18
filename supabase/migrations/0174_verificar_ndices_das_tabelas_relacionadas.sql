-- Verificar se há algum índice ou constraint que pode estar causando o problema
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'work_item_events'
  OR tablename = 'work_items'
ORDER BY tablename, indexname;