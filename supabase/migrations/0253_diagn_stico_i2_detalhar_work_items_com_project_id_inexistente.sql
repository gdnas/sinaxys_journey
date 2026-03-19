
-- ============================================
-- DIAGNÓSTICO I2: Listar work_items com project_id inexistente
-- ============================================
-- Detalhar work_items com project_id que não existe
SELECT 
  wi.id,
  wi.title,
  wi.project_id as project_id_inexistente
FROM work_items wi
WHERE wi.project_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM projects p WHERE p.id = wi.project_id)
LIMIT 10;
