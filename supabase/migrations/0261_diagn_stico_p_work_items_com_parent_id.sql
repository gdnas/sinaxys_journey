
-- ============================================
-- DIAGNÓSTICO P: Verificar work_items orphans
-- ============================================
-- Work_items sem parent_id ou com parent_id inexistente
SELECT 
  'DIAGNÓSTICO P' as diagnostico,
  'Work_items com parent_id' as descricao,
  COUNT(*) as total_work_items,
  COUNT(CASE WHEN parent_id IS NOT NULL THEN 1 END) as com_parent,
  COUNT(CASE WHEN parent_id IS NULL THEN 1 END) as sem_parent,
  COUNT(CASE 
    WHEN parent_id IS NOT NULL 
      AND NOT EXISTS (SELECT 1 FROM work_items p WHERE p.id = wi.parent_id) 
    THEN 1 
  END) as com_parent_invalido
FROM work_items wi;
