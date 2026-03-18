-- PASSO 2: Reproduzir erro real - criar work_item com key_result_id e deliverable_id (sem project_id)
BEGIN;

-- Testar insert com apenas OKR fields (sem project_id)
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
  'Teste de tarefa OKR - sem projeto',
  'task',
  'todo',
  'medium',
  'd9068441-409a-44e7-96a2-40e1859c431e'::uuid,
  'd9068441-409a-44e7-96a2-40e1859c431e'::uuid
)
RETURNING id, key_result_id, deliverable_id, project_id;

ROLLBACK;