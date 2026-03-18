-- TESTE FINAL 2: Criar task OKR apenas com key_result_id
BEGIN;

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
  'Teste Final B - apenas KR',
  'task',
  'todo',
  'medium',
  'd9068441-409a-44e7-96a2-40e1859c431e'::uuid,
  'd9068441-409a-44e7-96a2-40e1859c431e'::uuid
)
RETURNING id;

COMMIT;