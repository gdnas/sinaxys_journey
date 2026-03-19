
-- ============================================
-- DIAGNÓSTICO K: Detalhar work_items sem vínculo estratégico
-- ============================================
-- Listar work_items sem key_result_id e sem deliverable_id
SELECT 
  wi.id,
  wi.title,
  wi.status,
  wi.project_id,
  p.name as project_name
FROM work_items wi
LEFT JOIN projects p ON p.id = wi.project_id
WHERE wi.key_result_id IS NULL 
  AND wi.deliverable_id IS NULL
ORDER BY wi.created_at DESC;
