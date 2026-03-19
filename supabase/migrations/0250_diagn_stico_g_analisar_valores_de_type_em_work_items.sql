
-- ============================================
-- DIAGNÓSTICO G: Valores de type em work_items
-- ============================================
-- Analisar distribuição de type em work_items
SELECT 
  'DIAGNÓSTICO G' as diagnostico,
  'Distribuição de type em work_items' as descricao,
  type,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as porcentagem
FROM work_items
GROUP BY type
ORDER BY quantidade DESC;
