
-- ============================================
-- RELATÓRIO FINAL DE VERIFICAÇÃO
-- ============================================
SELECT 
  'VERIFICAÇÃO FINAL' as verificacao,
  'Índices e Triggers' as tipo,
  COUNT(*) as total_triggers
FROM information_schema.triggers
WHERE trigger_name LIKE 'trg_validate%'
UNION ALL
SELECT 
  'VERIFICAÇÃO FINAL' as verificacao,
  'Índice único' as tipo,
  1 as total_triggers
FROM pg_indexes
WHERE indexname = 'idx_project_members_unique'
UNION ALL
SELECT 
  'VERIFICAÇÃO FINAL' as verificacao,
  'Funções de validação' as tipo,
  COUNT(*) as total_triggers
FROM pg_proc
WHERE proname LIKE 'validate_work_item_%';
