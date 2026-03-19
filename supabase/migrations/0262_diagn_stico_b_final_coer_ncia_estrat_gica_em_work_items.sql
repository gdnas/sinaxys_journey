
-- ============================================
-- DIAGNÓSTICO B FINAL: Coerência estratégica em work_items
-- ============================================
SELECT 
  'DIAGNÓSTICO B (FINAL)' as diagnostico,
  'Work_items com vínculos estratégicos' as descricao,
  COUNT(*) as total_work_items,
  
  -- Work_items sem deliverable_id (não precisam verificar key_result)
  COUNT(CASE WHEN deliverable_id IS NULL THEN 1 END) as sem_deliverable,
  
  -- Work_items com deliverable_id e key_result_id coerentes
  COUNT(CASE 
    WHEN deliverable_id IS NOT NULL 
      AND key_result_id IS NOT NULL
      AND EXISTS (
        SELECT 1 FROM okr_deliverables d 
        WHERE d.id = wi.deliverable_id 
        AND d.key_result_id = wi.key_result_id
      )
    THEN 1 
  END) as deliverable_coerente,
  
  -- Work_items com deliverable_id e key_result_id INCOERENTES
  COUNT(CASE 
    WHEN deliverable_id IS NOT NULL 
      AND key_result_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM okr_deliverables d 
        WHERE d.id = wi.deliverable_id 
        AND d.key_result_id = wi.key_result_id
      )
    THEN 1 
  END) as deliverable_incoerente
FROM work_items wi;
