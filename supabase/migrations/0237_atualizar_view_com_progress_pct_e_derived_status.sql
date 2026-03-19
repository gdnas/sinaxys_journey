
-- ============================================
-- ATUALIZAR VIEW COM CAMPOS DERIVADOS
-- ============================================

CREATE OR REPLACE VIEW public.v_project_execution_summary AS
WITH base_counts AS (
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
  GROUP BY p.id, p.tenant_id, p.name, p.owner_user_id, p.key_result_id, p.deliverable_id
)
SELECT
  project_id,
  tenant_id,
  project_name,
  owner_user_id,
  key_result_id,
  deliverable_id,
  total_work_items,
  done_work_items,
  in_progress_work_items,
  todo_work_items,
  backlog_work_items,
  review_work_items,
  blocked_work_items,
  overdue_work_items,
  -- Calcular progress_pct: done / total * 100, arredondado
  CASE
    WHEN total_work_items = 0 THEN 0
    ELSE ROUND((done_work_items::numeric / total_work_items::numeric) * 100)
  END as progress_pct,
  -- Calcular derived_status conforme regras:
  -- 1. se total_work_items = 0 → 'todo'
  -- 2. se todos work_items = 'done' → 'done'
  -- 3. se existir algum work_item = 'blocked' → 'blocked'
  -- 4. se existir algum work_item = 'in_progress' → 'in_progress'
  -- 5. caso contrário → 'todo'
  CASE
    WHEN total_work_items = 0 THEN 'todo'
    WHEN blocked_work_items > 0 THEN 'blocked'
    WHEN in_progress_work_items > 0 THEN 'in_progress'
    WHEN total_work_items = done_work_items THEN 'done'
    ELSE 'todo'
  END as derived_status
FROM base_counts;

-- Atualizar comentário
COMMENT ON VIEW public.v_project_execution_summary IS 
'Camada de leitura derivada para projetos. 
Status e métricas calculados a partir de work_items.
Campos:
- total_work_items: total de tarefas do projeto
- done_work_items: tarefas concluídas
- in_progress_work_items: tarefas em andamento
- todo_work_items: tarefas pendentes
- backlog_work_items: tarefas no backlog
- review_work_items: tarefas em revisão
- blocked_work_items: tarefas bloqueadas
- overdue_work_items: tarefas atrasadas (vencidas e não concluídas)
- progress_pct: percentual de conclusão (0-100)
- derived_status: status derivado calculado (todo, in_progress, done, blocked)
Risco ZERO: VIEW APENAS LEITURA.';
