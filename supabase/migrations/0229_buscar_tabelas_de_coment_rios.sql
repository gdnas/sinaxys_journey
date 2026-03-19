
-- 5. Buscar tabelas relacionadas a comentários
SELECT 
    table_name
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND (table_name LIKE '%comment%' OR table_name LIKE '%item%')
ORDER BY table_name;
