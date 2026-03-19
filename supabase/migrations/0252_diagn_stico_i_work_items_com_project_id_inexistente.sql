
-- ============================================
-- DIAGNÓSTICO I: work_items com project_id inexistente
-- ============================================
-- Verificar work_items com project_id que não existe na tabela projects
SELECT 
  'DIAGNÓSTICO I' as diagnostico,
  'Work_items com project_id inexistente' as descricao,
  COUNT(*) as work_items_com_project_invalido
FROM work_items wi
WHERE wi.project_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = wi.project_id);
