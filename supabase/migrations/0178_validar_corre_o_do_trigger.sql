-- VALIDAÇÃO: Testar a correção do trigger
BEGIN;

-- Teste 1: Criar work_item com deliverable_id e key_result_id
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
  'Teste validação correção',
  'task',
  'todo',
  'medium',
  'd9068441-409a-44e7-96a2-40e1859c431e'::uuid,
  'd9068441-409a-44e7-96a2-40e1859c431e'::uuid
)
RETURNING id;

-- Verificar se o evento foi criado
SELECT 
  id,
  work_item_id,
  user_id,
  event_type,
  new_value
FROM public.work_item_events
WHERE work_item_id = (SELECT id FROM work_items WHERE title = 'Teste validação correção' ORDER BY created_at DESC LIMIT 1)
ORDER BY created_at DESC
LIMIT 1;

ROLLBACK;