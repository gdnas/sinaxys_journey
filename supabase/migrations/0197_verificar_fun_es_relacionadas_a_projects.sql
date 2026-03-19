
-- 5. Verificar a função existente de coerência de tenant
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%project%';
