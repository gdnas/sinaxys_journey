
-- Teste completo da VIEW com todos os campos
SELECT 
  project_id,
  project_name,
  total_work_items,
  done_work_items,
  in_progress_work_items,
  todo_work_items,
  backlog_work_items,
  review_work_items,
  blocked_work_items,
  overdue_work_items,
  progress_pct::integer as progress_pct_int,
  derived_status,
  CASE derived_status
    WHEN 'todo' THEN '✓'
    WHEN 'in_progress' THEN '✓'
    WHEN 'done' THEN '✓'
    WHEN 'blocked' THEN '✓'
    ELSE '?'
  END as logic_valid
FROM public.v_project_execution_summary
ORDER BY project_name;
