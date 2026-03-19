
-- ============================================
-- DIAGNÓSTICO E: Valores de status em work_items
-- ============================================
-- Analisar distribuição de status em work_items
SELECT 
  'DIAGNÓSTICO E' as diagnostico,
  'Distribuição de status em work_items' as descricao,
  status,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as porcentagem
FROM work_items
GROUP BY status
ORDER BY quantidade DESC;
