
-- Testar a VIEW criada
SELECT 
  project_id,
  project_name,
  total_work_items,
  done_work_items,
  in_progress_work_items,
  todo_work_items,
  blocked_work_items,
  overdue_work_items,
  progress_pct,
  derived_status
FROM public.v_project_execution_summary
ORDER BY project_name;
