-- PASSO 2: Teste específico - Passar apenas deliverable_id (sem key_result_id)
BEGIN;

-- Inserir work_item com apenas deliverable_id
-- O trigger deve preencher o key_result_id automaticamente
INSERT INTO public.work_items (
  tenant_id,
  deliverable_id,
  title,
  type,
  status,
  priority,
  assignee_user_id,
  created_by_user_id
) VALUES (
  'b803164b-2b0a-47ad-9187-eabe7314491d'::uuid,
  '78b90c9e-db73-4a63-a52c-0937e37ddb98'::uuid,
  'Teste - apenas deliverable',
  'task',
  'todo',
  'medium',
  'd9068441-409a-44e7-96a2-40e1859c431e'::uuid,
  'd9068441-409a-44e7-96a2-40e1859c431e'::uuid
)
RETURNING id, key_result_id, deliverable_id;

ROLLBACK;