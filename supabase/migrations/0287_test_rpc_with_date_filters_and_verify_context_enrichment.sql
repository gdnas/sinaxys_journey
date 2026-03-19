
-- ============================================================================
-- Teste da RPC com filtro de datas (última semana)
-- ============================================================================

SELECT 
  COUNT(*) as total_work_items,
  COUNT(CASE WHEN objective_title IS NOT NULL THEN 1 END) as with_okr_context,
  COUNT(CASE WHEN project_name IS NOT NULL THEN 1 END) as with_project_context,
  COUNT(CASE WHEN cycle_label IS NOT NULL THEN 1 END) as with_cycle_label
FROM public.work_items_for_user_with_okr_context(
  p_user_id := '24d437e4-647d-4619-b36a-7166043e85c3'::uuid,
  p_from := '2026-01-01'::date,
  p_to := '2026-12-31'::date
);
