
-- ============================================
-- MIGRATION: Project Execution Summary View
-- ============================================

CREATE OR REPLACE VIEW public.v_project_execution_summary AS
SELECT
  p.id as project_id,
  p.tenant_id,
  p.name as project_name,
  p.owner_user_id,
  p.key_result_id,
  p.deliverable_id,
  COUNT(wi.id) FILTER (WHERE wi.status IS NOT NULL) as total_work_items,
  COUNT(wi.id) FILTER (WHERE wi.status = 'done') as done_work_items,
  COUNT(wi.id) FILTER (WHERE wi.status = 'in_progress') as in_progress_work_items,
  COUNT(wi.id) FILTER (WHERE wi.status = 'todo') as todo_work_items,
  COUNT(wi.id) FILTER (WHERE wi.status = 'backlog') as backlog_work_items,
  COUNT(wi.id) FILTER (WHERE wi.status = 'review') as review_work_items,
  COUNT(wi.id) FILTER (WHERE wi.status = 'blocked') as blocked_work_items,
  COUNT(wi.id) FILTER (WHERE wi.status IS NOT NULL AND wi.status <> 'done' AND wi.due_date IS NOT NULL AND wi.due_date < NOW()) as overdue_work_items
FROM public.projects p
LEFT JOIN public.work_items wi ON wi.project_id = p.id
GROUP BY p.id, p.tenant_id, p.name, p.owner_user_id, p.key_result_id, p.deliverable_id;

-- Comentário documentando a VIEW
COMMENT ON VIEW public.v_project_execution_summary IS 
'Camada de leitura derivada para projetos. 
Status e métricas calculados a partir de work_items.
Não altera dados, apenas agrega. 
Risco ZERO: VIEW APENAS LEITURA.';
