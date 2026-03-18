select
  wi.id,
  wi.legacy_okr_task_id,
  wi.key_result_id,
  wi.deliverable_id,
  wi.parent_id,
  wi.assignee_user_id,
  wi.status,
  wi.priority,
  wi.checklist,
  wi.created_at
from public.work_items wi
where wi.legacy_okr_task_id is not null
order by wi.created_at asc;