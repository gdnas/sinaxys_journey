-- TESTE REAL COM COMMIT para verificar eventos
BEGIN;

-- Teste 1: Criar task OKR completa
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
  'Teste logging A - task completa',
  'task',
  'todo',
  'medium',
  'd9068441-409a-44e7-96a2-40e1859c431e'::uuid,
  'd9068441-409a-44e7-96a2-40e1859c431e'::uuid
)
RETURNING id;

-- Teste 2: Atualizar status
UPDATE public.work_items
SET status = 'in_progress'
WHERE title = 'Teste logging A - task completa';

COMMIT;