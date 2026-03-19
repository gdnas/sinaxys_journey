-- Verificar funções que buscam em okr_tasks
SELECT routine_name, routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%task%'
ORDER BY routine_name;
