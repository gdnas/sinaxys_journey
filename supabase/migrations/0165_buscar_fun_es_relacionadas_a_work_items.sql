-- Buscar todas as funções que podem estar criando work_items
SELECT 
  routine_name,
  routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND (
    routine_name LIKE '%work_item%'
    OR routine_name LIKE '%create_task%'
    OR routine_name LIKE '%task%'
  )
ORDER BY routine_name;