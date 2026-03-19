
-- ============================================
-- DIAGNÓSTICO E2: Valores de status em projects
-- ============================================
-- Analisar distribuição de status em projects
SELECT 
  'DIAGNÓSTICO E2' as diagnostico,
  'Distribuição de status em projects' as descricao,
  status,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as porcentagem
FROM projects
GROUP BY status
ORDER BY quantidade DESC;
