-- VALIDAÇÃO 3: Teste real COM ROLLBACK (para não persistir dados)
BEGIN;

-- Teste 1: Criar task OKR com key_result_id + deliverable_id
INSERT INTO public.work_items (
  tenant_id,
  key_result_id,
  deliverable_id,
  title,
  type,
  status,
  priority,
  assignee_user_id,
  created_by_user_id
) VALUES (
  'b803164b-2b0a-47ad-9187-eabe7314491d'::uuid,
  '7713b9a1-5f85-4e8e-8354-42571b553729'::uuid,
  '78b90c9e-db73-4a63-a52c-0937e37ddb98'::uuid,
  'Teste A - task completa',
  'task',
  'todo',
  'medium',
  'd9068441-409a-44e7-96a2-40e1859c431e'::uuid,
  'd9068441-409a-44e7-96a2-40e1859c431e'::uuid
)
RETURNING id as task_a_id;

-- Teste 2: Criar task OKR apenas com key_result_id
INSERT INTO public.work_items (
  tenant_id,
  key_result_id,
  title,
  type,
  status,
  priority,
  assignee_user_id,
  created_by_user_id
) VALUES (
  'b803164b-2b0a-47ad-9187-eabe7314491d'::uuid,
  '7713b9a1-5f85-4e8e-8354-42571b553729'::uuid,
  'Teste B - apenas KR',
  'task',
  'todo',
  'medium',
  'd9068441-409a-44e7-96a2-40e1859c431e'::uuid,
  'd9068441-409a-44e7-96a2-40e1859c431e'::uuid
)
RETURNING id as task_b_id;

-- Teste 3: Atualizar status da task A
UPDATE public.work_items
SET status = 'in_progress'
WHERE title = 'Teste A - task completa'
RETURNING id, status;

ROLLBACK;