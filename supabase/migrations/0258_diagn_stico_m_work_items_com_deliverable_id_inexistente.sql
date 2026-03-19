
-- ============================================
-- DIAGNÓSTICO M: Verificar integridade referencial de deliverable
-- ============================================
-- Work_items com deliverable_id que não existe na tabela okr_deliverables
SELECT 
  'DIAGNÓSTICO M' as diagnostico,
  'Work_items com deliverable_id inexistente' as descricao,
  COUNT(*) as work_items_com_deliverable_invalido
FROM work_items wi
WHERE wi.deliverable_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM okr_deliverables d WHERE d.id = wi.deliverable_id);
