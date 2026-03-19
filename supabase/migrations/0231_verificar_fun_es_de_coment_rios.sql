
-- 7. Verificar se há código backend que lida com comentários
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%comment%';
