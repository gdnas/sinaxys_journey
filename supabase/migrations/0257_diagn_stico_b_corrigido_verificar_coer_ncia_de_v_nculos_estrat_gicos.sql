
-- ============================================
-- DIAGNÓSTICO B CORRIGIDO: Coerência estratégica em work_items
-- ============================================
SELECT 
  'DIAGNÓSTICO B (CORRIGIDO)' as diagnostico,
  'Work_items com vínculos estratégicos' as descricao,
  COUNT(*) as total_work_items,
  COUNT(CASE 
    WHEN deliverable_id IS NOT NULL AND key_result_id IS NOT NULL THEN
      CASE WHEN EXISTS (
        SELECT 1 FROM okr_deliverables d 
        WHERE d.id = wi.deliverable_id 
        AND d.key_result_id = wi.key_result_id
      ) THEN 1 ELSE 0 END
    WHEN deliverable_id IS NULL OR key_result_id IS NULL THEN 1
    ELSE 0
  END) as vinculos_coerentes,
  COUNT(CASE 
    WHEN deliverable_id IS NOT NULL AND key_result_id IS NOT NULL THEN
      CASE WHEN NOT EXISTS (
        SELECT 1 FROM okr_deliverables d 
        WHERE d.id = wi.deliverable_id 
        AND d.key_result_id = wi.key_result_id
      ) THEN 1 ELSE 0 END
    ELSE 0
  END) as vinculos_incoerentes
FROM work_items wi;
