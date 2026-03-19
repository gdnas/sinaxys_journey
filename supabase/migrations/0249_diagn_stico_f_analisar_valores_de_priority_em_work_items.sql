
-- ============================================
-- DIAGNÓSTICO F: Valores de priority em work_items
-- ============================================
-- Analisar distribuição de priority em work_items
SELECT 
  'DIAGNÓSTICO F' as diagnostico,
  'Distribuição de priority em work_items' as descricao,
  priority,
  COUNT(*) as quantidade,
  ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 2) as porcentagem
FROM work_items
GROUP BY priority
ORDER BY quantidade DESC;
