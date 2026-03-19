
-- 5. Verificar se há funções para notificações
SELECT 
    routine_name,
    routine_type
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name LIKE '%notification%';
