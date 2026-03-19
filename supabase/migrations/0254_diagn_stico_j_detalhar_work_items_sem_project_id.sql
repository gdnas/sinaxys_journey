
-- ============================================
-- DIAGNÓSTICO J: Detalhar work_items sem projeto
-- ============================================
-- Listar work_items sem project_id
SELECT 
  wi.id,
  wi.title,
  wi.status,
  wi.key_result_id,
  wi.deliverable_id,
  CASE 
    WHEN wi.key_result_id IS NOT NULL THEN 'tem KR'
    WHEN wi.deliverable_id IS NOT NULL THEN 'tem deliverable'
    ELSE 'sem vínculo estratégico'
  END as tipo_vinculo
FROM work_items wi
WHERE wi.project_id IS NULL
ORDER BY wi.created_at DESC;
