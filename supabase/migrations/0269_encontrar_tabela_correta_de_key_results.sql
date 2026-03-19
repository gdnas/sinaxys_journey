
-- ============================================
-- DIAGNÓSTICO: Encontrar tabela correta de key_results
-- ============================================
SELECT 
  table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND (table_name LIKE '%key_result%' OR table_name LIKE '%kr%')
ORDER BY table_name;
