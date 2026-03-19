
-- ============================================================================
-- Teste da RPC final v3.0
-- ============================================================================

SELECT 
  id,
  project_id,
  title,
  status,
  priority,
  due_date,
  project_name,
  key_result_title,
  objective_title,
  cycle_label
FROM public.work_items_for_user_with_okr_context(
  p_user_id := '24d437e4-647d-4619-b36a-7166043e85c3'::uuid,
  p_from := NULL,
  p_to := NULL
)
LIMIT 5;
