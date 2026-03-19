
-- ============================================
-- DIAGNÓSTICO: Verificar qual tabela de key_results é usada em work_items
-- ============================================
SELECT 
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'work_items'::regclass
  AND confrelid IS NOT NULL
ORDER BY conname;
