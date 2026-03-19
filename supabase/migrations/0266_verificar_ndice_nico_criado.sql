
-- ============================================
-- VERIFICAÇÃO: Listar índices criados
-- ============================================
SELECT 
  indexname as index_name,
  tablename as table_name,
  indexdef as definition
FROM pg_indexes
WHERE indexname = 'idx_project_members_unique'
ORDER BY indexname;
