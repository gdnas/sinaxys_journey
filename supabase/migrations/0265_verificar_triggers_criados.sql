
-- ============================================
-- VERIFICAÇÃO: Listar triggers criados
-- ============================================
SELECT 
  trigger_name,
  event_manipulation as event_type,
  event_object_table as table_name,
  action_statement,
  action_timing as timing
FROM information_schema.triggers
WHERE trigger_name LIKE 'trg_validate%'
ORDER BY trigger_name;
