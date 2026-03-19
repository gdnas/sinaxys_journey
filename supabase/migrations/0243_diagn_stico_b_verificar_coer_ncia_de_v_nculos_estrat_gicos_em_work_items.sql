
-- ============================================
-- DIAGNÓSTICO B: Coerência estratégica em work_items
-- ============================================
-- Verificar work_items com vínculos estratégicos incoerentes
SELECT 
  'DIAGNÓSTICO B' as diagnostico,
  'Work_items com vínculos estratégicos incoerentes' as descricao,
  COUNT(*) as total_work_items,
  COUNT(CASE WHEN key_result_id IS NOT NULL OR deliverable_id IS NOT NULL THEN 1 END) as com_vinculo_estrategico,
  COUNT(CASE 
    WHEN deliverable_id IS NOT NULL AND key_result_id IS NOT NULL THEN 
      CASE WHEN EXISTS (
        SELECT 1 FROM okr_deliverables d 
        WHERE d.id = wi.deliverable_id 
        AND d.key_result_id = wi.key_result_id
      ) THEN 1 ELSE 0 END
    WHEN deliverable_id IS NULL THEN 1
    WHEN key_result_id IS NULL THEN 1
  END) as vinculos_coerentes,
  COUNT(CASE 
    WHEN deliverable_id IS NOT NULL AND key_result_id IS NOT NULL THEN 
      CASE WHEN EXISTS (
        SELECT 1 FROM okr_deliverables d 
        WHERE d.id = wi.deliverable_id 
        AND d.key_result_id = wi.key_result_id
      ) THEN 0 ELSE 1 END
  END) as vinculos_incoerentes
FROM work_items wi;
