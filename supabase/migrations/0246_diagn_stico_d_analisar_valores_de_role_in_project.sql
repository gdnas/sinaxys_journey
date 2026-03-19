
-- ============================================
-- DIAGNÓSTICO D: Valores de role_in_project em project_members
-- ============================================
-- Analisar distribuição de roles e identificar valores fora do domínio
SELECT 
  'DIAGNÓSTICO D' as diagnostico,
  'Distribuição de roles em project_members' as descricao,
  role_in_project,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as porcentagem
FROM project_members
GROUP BY role_in_project
ORDER BY quantidade DESC;
