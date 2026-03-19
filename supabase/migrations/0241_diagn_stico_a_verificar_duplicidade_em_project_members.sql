
-- ============================================
-- DIAGNÓSTICO A: Duplicidade em project_members
-- ============================================
-- Verificar se há membros duplicados (project_id, user_id)
SELECT 
  'DIAGNÓSTICO A' as diagnostico,
  'Duplicidade em project_members' as descricao,
  COUNT(*) as total_registros,
  COUNT(DISTINCT (project_id, user_id)) as combinacoes_unicas,
  COUNT(*) - COUNT(DISTINCT (project_id, user_id)) as duplicatas_encontradas
FROM project_members;
