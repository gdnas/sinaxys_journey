begin;
set local role authenticated;
set local request.jwt.claim.sub = '67acbc23-10a2-4424-b033-36e6985f7ad1';
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
  '15de0336-fa2e-4a8d-b4d6-d783ca295b65'::uuid,
  '78d61014-4869-45f4-a777-87cc2d1ef9b7'::uuid,
  null,
  null,
  'teste task projeto',
  null,
  'task',
  'todo',
  'medium',
  '67acbc23-10a2-4424-b033-36e6985f7ad1'::uuid,
  '67acbc23-10a2-4424-b033-36e6985f7ad1'::uuid,
  null,
  '2026-03-20'::timestamptz,
  '2026-03-20'::timestamptz,
  45,
  null,
  null,
  null,
  null
)
returning id, tenant_id, project_id, key_result_id, deliverable_id, status, priority, type;
rollback;