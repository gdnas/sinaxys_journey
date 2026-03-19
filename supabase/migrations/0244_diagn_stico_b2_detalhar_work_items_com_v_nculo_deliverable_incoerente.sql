
-- ============================================
-- DIAGNÓSTICO B2: Listar work_items com vínculos incoerentes
-- ============================================
-- Detalhar work_items onde deliverable_id não pertence ao key_result_id
SELECT 
  wi.id,
  wi.title,
  wi.key_result_id,
  wi.deliverable_id,
  d.key_result_id as deliverable_key_result_id
FROM work_items wi
LEFT JOIN okr_deliverables d ON d.id = wi.deliverable_id
WHERE wi.deliverable_id IS NOT NULL 
  AND wi.key_result_id IS NOT NULL
  AND d.key_result_id IS NOT NULL
  AND d.key_result_id <> wi.key_result_id;
