begin;
set local role authenticated;
set local request.jwt.claim.sub = 'd9068441-409a-44e7-96a2-40e1859c431e';
set local request.jwt.claim.role = 'authenticated';
insert into public.work_items (
  tenant_id,
  project_id,
  key_result_id,
  deliverable_id,
  title,
  description,
  type,
  status,
  priority,
  assignee_user_id,
  created_by_user_id,
  parent_id,
  due_date,
  start_date,
  estimate_minutes,
  checklist,
  estimated_value_brl,
  estimated_cost_brl,
  estimated_roi_pct
) values (
  'b803164b-2b0a-47ad-9187-eabe7314491d'::uuid,
  null,
  '138f80e1-bbb6-493d-8939-90a92ec44fb8'::uuid,
  'adbf124b-d699-4cfa-8853-c7829f604a06'::uuid,
  'teste integracao okr tasks',
  null,
  'task',
  'todo',
  'medium',
  'd9068441-409a-44e7-96a2-40e1859c431e'::uuid,
  'd9068441-409a-44e7-96a2-40e1859c431e'::uuid,
  null,
  '2026-03-19'::timestamptz,
  '2026-03-19'::timestamptz,
  30,
  null,
  null,
  null,
  null
);
rollback;