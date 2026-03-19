
-- ============================================
-- DIAGNÓSTICO L: Verificar work_items com incoerência B2
-- ============================================
-- Re-executar para confirmar os 5 work_items incoerentes
SELECT 
  wi.id,
  wi.title,
  wi.key_result_id,
  wi.deliverable_id,
  d.key_result_id as deliverable_kr_id,
  CASE 
    WHEN wi.deliverable_id IS NOT NULL AND wi.key_result_id IS NOT NULL THEN
      CASE 
        WHEN d.key_result_id = wi.key_result_id THEN 'coerente'
        ELSE 'incoerente'
      END
    ELSE 'não aplicável'
  END as status_vinculo
FROM work_items wi
LEFT JOIN okr_deliverables d ON d.id = wi.deliverable_id
WHERE wi.deliverable_id IS NOT NULL 
  AND wi.key_result_id IS NOT NULL
ORDER BY wi.id;
