drop policy if exists work_items_select_policy on public.work_items;
drop policy if exists work_items_insert_policy on public.work_items;
drop policy if exists work_items_update_policy on public.work_items;
drop policy if exists work_items_delete_policy on public.work_items;

create policy work_items_select_policy
on public.work_items
for select
using (public.can_view_work_item(id));

create policy work_items_insert_policy
on public.work_items
for insert
with check (
  public.can_create_work_item(
    tenant_id,
    project_id,
    key_result_id,
    deliverable_id,
    assignee_user_id,
    created_by_user_id
  )
);

create policy work_items_update_policy
on public.work_items
for update
using (public.can_manage_work_item(id))
with check (public.can_manage_work_item(id));

create policy work_items_delete_policy
on public.work_items
for delete
using (public.can_manage_work_item(id));

drop policy if exists comments_select_policy on public.work_item_comments;
drop policy if exists comments_insert_policy on public.work_item_comments;
drop policy if exists comments_update_policy on public.work_item_comments;
drop policy if exists comments_delete_policy on public.work_item_comments;

create policy comments_select_policy
on public.work_item_comments
for select
using (public.can_view_work_item(work_item_id));

create policy comments_insert_policy
on public.work_item_comments
for insert
with check (user_id = auth.uid() and public.can_view_work_item(work_item_id));

create policy comments_update_policy
on public.work_item_comments
for update
using (user_id = auth.uid() or public.can_manage_work_item(work_item_id))
with check (user_id = auth.uid() or public.can_manage_work_item(work_item_id));

create policy comments_delete_policy
on public.work_item_comments
for delete
using (user_id = auth.uid() or public.can_manage_work_item(work_item_id));

drop policy if exists events_select_policy on public.work_item_events;
create policy events_select_policy
on public.work_item_events
for select
using (public.can_view_work_item(work_item_id));

drop policy if exists work_item_status_history_select_policy on public.work_item_status_history;
create policy work_item_status_history_select_policy
on public.work_item_status_history
for select
using (public.can_view_work_item(work_item_id));

insert into public.work_items (
  tenant_id,
  project_id,
  title,
  description,
  type,
  status,
  priority,
  assignee_user_id,
  parent_id,
  start_date,
  due_date,
  completed_at,
  created_by_user_id,
  created_at,
  updated_at,
  key_result_id,
  deliverable_id,
  estimate_minutes,
  checklist,
  estimated_value_brl,
  estimated_cost_brl,
  estimated_roi_pct,
  legacy_okr_task_id
)
select
  o.company_id,
  null,
  t.title,
  t.description,
  'task',
  case
    when t.status = 'DONE' then 'done'
    when t.status = 'IN_PROGRESS' then 'in_progress'
    else 'todo'
  end,
  'medium',
  t.owner_user_id,
  null,
  coalesce(t.start_date, t.created_at),
  case when t.due_date is null then null else (t.due_date::timestamp at time zone 'UTC') end,
  t.completed_at,
  t.owner_user_id,
  t.created_at,
  t.updated_at,
  d.key_result_id,
  t.deliverable_id,
  t.estimate_minutes,
  t.checklist,
  t.estimated_value_brl,
  t.estimated_cost_brl,
  t.estimated_roi_pct,
  t.id
from public.okr_tasks t
join public.okr_deliverables d on d.id = t.deliverable_id
join public.okr_key_results kr on kr.id = d.key_result_id
join public.okr_objectives o on o.id = kr.objective_id
where not exists (
  select 1
  from public.work_items wi
  where wi.legacy_okr_task_id = t.id
);

update public.work_items child
set parent_id = parent.id
from public.okr_tasks legacy_child
join public.work_items parent on parent.legacy_okr_task_id = legacy_child.parent_task_id
where child.legacy_okr_task_id = legacy_child.id
  and child.parent_id is distinct from parent.id;

insert into public.work_item_comments (work_item_id, user_id, content, created_at, updated_at)
select
  wi.id,
  c.author_user_id,
  c.body,
  c.created_at,
  c.created_at
from public.okr_task_comments c
join public.work_items wi on wi.legacy_okr_task_id = c.task_id
where not exists (
  select 1
  from public.work_item_comments wc
  where wc.work_item_id = wi.id
    and wc.user_id = c.author_user_id
    and wc.content = c.body
    and wc.created_at = c.created_at
);