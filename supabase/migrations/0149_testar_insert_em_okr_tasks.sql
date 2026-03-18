-- Testar insert na tabela correta de OKR (okr_tasks)
BEGIN;

INSERT INTO public.okr_tasks (
  deliverable_id,
  title,
  description,
  owner_user_id,
  status,
  due_date,
  estimate_minutes,
  checklist,
  estimated_value_brl,
  estimated_cost_brl,
  estimated_roi_pct
) VALUES (
  '78b90c9e-db73-4a63-a52c-0937e37ddb98'::uuid,
  'Teste de tarefa OKR',
  'Descrição de teste',
  'd9068441-409a-44e7-96a2-40e1859c431e'::uuid,
  'TODO',
  NULL,
  NULL,
  NULL,
  NULL,
  NULL,
  NULL
)
RETURNING id;

ROLLBACK;