begin;

alter table public.okr_objectives
  add column if not exists okr_level text;

update public.okr_objectives
set okr_level = case when level = 'COMPANY' then 'strategic' else 'tactical' end
where okr_level is null;

alter table public.okr_objectives
  alter column okr_level set not null;

alter table public.okr_objectives
  drop constraint if exists okr_objectives_okr_level_check;

alter table public.okr_objectives
  add constraint okr_objectives_okr_level_check
  check (okr_level in ('strategic', 'tactical'));

update public.okr_objectives o
set department_id = p.department_id
from public.profiles p
where o.okr_level = 'tactical'
  and o.department_id is null
  and p.id = o.owner_user_id
  and p.department_id is not null;

alter table public.okr_key_results
  add column if not exists description text;

alter table public.okr_deliverables
  add column if not exists department_id uuid references public.departments(id) on delete set null;

update public.okr_deliverables d
set department_id = o.department_id
from public.okr_key_results kr
join public.okr_objectives o on o.id = kr.objective_id
where d.key_result_id = kr.id
  and d.department_id is null;

alter table public.projects
  alter column department_id type uuid using nullif(department_id, '')::uuid;

alter table public.projects
  alter column department_ids type uuid[] using department_ids::uuid[];

alter table public.projects
  add column if not exists key_result_id uuid,
  add column if not exists deliverable_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'projects_department_id_fkey'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_department_id_fkey
      foreign key (department_id) references public.departments(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'projects_key_result_id_fkey'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_key_result_id_fkey
      foreign key (key_result_id) references public.okr_key_results(id) on delete set null;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'projects_deliverable_id_fkey'
      and conrelid = 'public.projects'::regclass
  ) then
    alter table public.projects
      add constraint projects_deliverable_id_fkey
      foreign key (deliverable_id) references public.okr_deliverables(id) on delete set null;
  end if;
end $$;

create index if not exists idx_projects_key_result_id on public.projects(key_result_id);
create index if not exists idx_projects_deliverable_id on public.projects(deliverable_id);
create index if not exists idx_projects_department_id on public.projects(department_id);
create index if not exists idx_okr_objectives_okr_level on public.okr_objectives(okr_level);
create index if not exists idx_okr_deliverables_department_id on public.okr_deliverables(department_id);

create or replace function public.can_view_okr_scope(
  p_company_id uuid,
  p_okr_level text,
  p_department_id uuid,
  p_owner_user_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_role text;
  v_company_id uuid;
  v_department_id uuid;
begin
  if auth.uid() is null then
    return false;
  end if;

  perform set_config('row_security', 'off', true);

  select role, company_id, department_id
    into v_role, v_company_id, v_department_id
  from public.profiles
  where id = auth.uid();

  if v_role = 'MASTERADMIN' then
    return true;
  end if;

  if v_company_id is null or v_company_id <> p_company_id then
    return false;
  end if;

  if v_role = 'ADMIN' then
    return true;
  end if;

  if v_role = 'HEAD' then
    return p_okr_level = 'strategic'
      or p_owner_user_id = auth.uid()
      or (v_department_id is not null and p_department_id = v_department_id);
  end if;

  return p_owner_user_id = auth.uid();
end;
$$;

create or replace function public.can_manage_okr_scope(
  p_company_id uuid,
  p_okr_level text,
  p_department_id uuid
)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_role text;
  v_company_id uuid;
  v_department_id uuid;
begin
  if auth.uid() is null then
    return false;
  end if;

  perform set_config('row_security', 'off', true);

  select role, company_id, department_id
    into v_role, v_company_id, v_department_id
  from public.profiles
  where id = auth.uid();

  if v_role = 'MASTERADMIN' then
    return true;
  end if;

  if v_company_id is null or v_company_id <> p_company_id then
    return false;
  end if;

  if v_role = 'ADMIN' then
    return true;
  end if;

  if v_role = 'HEAD' then
    return p_okr_level = 'tactical'
      and v_department_id is not null
      and p_department_id = v_department_id;
  end if;

  return false;
end;
$$;

create or replace function public.can_view_project(
  p_project_id uuid,
  p_tenant_id uuid,
  p_owner_user_id uuid,
  p_department_id uuid,
  p_department_ids uuid[]
)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_role text;
  v_company_id uuid;
  v_department_id uuid;
begin
  if auth.uid() is null then
    return false;
  end if;

  perform set_config('row_security', 'off', true);

  select role, company_id, department_id
    into v_role, v_company_id, v_department_id
  from public.profiles
  where id = auth.uid();

  if v_role = 'MASTERADMIN' then
    return true;
  end if;

  if v_company_id is null or v_company_id <> p_tenant_id then
    return false;
  end if;

  if v_role = 'ADMIN' then
    return true;
  end if;

  if p_owner_user_id = auth.uid() then
    return true;
  end if;

  if exists (
    select 1
    from public.project_members pm
    where pm.project_id = p_project_id
      and pm.user_id = auth.uid()
  ) then
    return true;
  end if;

  if v_role = 'HEAD'
     and v_department_id is not null
     and (
       p_department_id = v_department_id
       or v_department_id = any(coalesce(p_department_ids, array[]::uuid[]))
     ) then
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.can_manage_project(
  p_tenant_id uuid,
  p_department_id uuid,
  p_department_ids uuid[]
)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_role text;
  v_company_id uuid;
  v_department_id uuid;
begin
  if auth.uid() is null then
    return false;
  end if;

  perform set_config('row_security', 'off', true);

  select role, company_id, department_id
    into v_role, v_company_id, v_department_id
  from public.profiles
  where id = auth.uid();

  if v_role = 'MASTERADMIN' then
    return true;
  end if;

  if v_company_id is null or v_company_id <> p_tenant_id then
    return false;
  end if;

  if v_role = 'ADMIN' then
    return true;
  end if;

  if v_role = 'HEAD'
     and v_department_id is not null
     and (
       p_department_id = v_department_id
       or v_department_id = any(coalesce(p_department_ids, array[]::uuid[]))
     ) then
    return true;
  end if;

  return false;
end;
$$;

create or replace function public.ensure_project_tenant_coherence()
returns trigger
language plpgsql
as $$
declare
  owner_company uuid;
  creator_company uuid;
  key_result_company uuid;
  deliverable_company uuid;
  deliverable_key_result_id uuid;
begin
  if new.owner_user_id is not null then
    select company_id::uuid into owner_company from public.profiles where id = new.owner_user_id;
    if owner_company is not null and owner_company <> new.tenant_id then
      raise exception 'owner_user_id belongs to different tenant';
    end if;
  end if;

  if new.created_by_user_id is not null then
    select company_id::uuid into creator_company from public.profiles where id = new.created_by_user_id;
    if creator_company is not null and creator_company <> new.tenant_id then
      raise exception 'created_by_user_id belongs to different tenant';
    end if;
  end if;

  if new.key_result_id is not null then
    select o.company_id::uuid
      into key_result_company
    from public.okr_key_results kr
    join public.okr_objectives o on o.id = kr.objective_id
    where kr.id = new.key_result_id;

    if key_result_company is null then
      raise exception 'key_result_id not found';
    end if;

    if key_result_company <> new.tenant_id then
      raise exception 'project.key_result belongs to different tenant';
    end if;
  end if;

  if new.deliverable_id is not null then
    select o.company_id::uuid, d.key_result_id
      into deliverable_company, deliverable_key_result_id
    from public.okr_deliverables d
    join public.okr_key_results kr on kr.id = d.key_result_id
    join public.okr_objectives o on o.id = kr.objective_id
    where d.id = new.deliverable_id;

    if deliverable_company is null then
      raise exception 'deliverable_id not found';
    end if;

    if deliverable_company <> new.tenant_id then
      raise exception 'project.deliverable belongs to different tenant';
    end if;

    if new.key_result_id is null then
      raise exception 'deliverable_id requires key_result_id';
    end if;

    if deliverable_key_result_id <> new.key_result_id then
      raise exception 'deliverable_id does not belong to key_result_id';
    end if;
  end if;

  return new;
end;
$$;

create or replace function public.sync_deliverable_department()
returns trigger
language plpgsql
as $$
declare
  resolved_department_id uuid;
begin
  select o.department_id
    into resolved_department_id
  from public.okr_key_results kr
  join public.okr_objectives o on o.id = kr.objective_id
  where kr.id = new.key_result_id;

  if new.department_id is null then
    new.department_id = resolved_department_id;
  end if;

  return new;
end;
$$;

drop trigger if exists trg_okr_deliverables_department_sync on public.okr_deliverables;
create trigger trg_okr_deliverables_department_sync
before insert or update on public.okr_deliverables
for each row execute function public.sync_deliverable_department();

drop policy if exists okr_objectives_select on public.okr_objectives;
drop policy if exists okr_objectives_insert_owner_or_admin on public.okr_objectives;
drop policy if exists okr_objectives_update_owner_or_admin on public.okr_objectives;
drop policy if exists okr_objectives_delete_owner_or_admin on public.okr_objectives;
create policy okr_objectives_select on public.okr_objectives
for select to authenticated
using (public.can_view_okr_scope(company_id, okr_level, department_id, owner_user_id));
create policy okr_objectives_insert_scope on public.okr_objectives
for insert to authenticated
with check (public.can_manage_okr_scope(company_id, okr_level, department_id));
create policy okr_objectives_update_scope on public.okr_objectives
for update to authenticated
using (public.can_manage_okr_scope(company_id, okr_level, department_id))
with check (public.can_manage_okr_scope(company_id, okr_level, department_id));
create policy okr_objectives_delete_scope on public.okr_objectives
for delete to authenticated
using (public.can_manage_okr_scope(company_id, okr_level, department_id));

drop policy if exists okr_key_results_select on public.okr_key_results;
drop policy if exists okr_key_results_write_owner_or_admin on public.okr_key_results;
create policy okr_key_results_select on public.okr_key_results
for select to authenticated
using (
  exists (
    select 1
    from public.okr_objectives o
    where o.id = okr_key_results.objective_id
      and public.can_view_okr_scope(o.company_id, o.okr_level, o.department_id, o.owner_user_id)
  )
);
create policy okr_key_results_insert_scope on public.okr_key_results
for insert to authenticated
with check (
  exists (
    select 1
    from public.okr_objectives o
    where o.id = okr_key_results.objective_id
      and public.can_manage_okr_scope(o.company_id, o.okr_level, o.department_id)
  )
);
create policy okr_key_results_update_scope on public.okr_key_results
for update to authenticated
using (
  exists (
    select 1
    from public.okr_objectives o
    where o.id = okr_key_results.objective_id
      and public.can_manage_okr_scope(o.company_id, o.okr_level, o.department_id)
  )
)
with check (
  exists (
    select 1
    from public.okr_objectives o
    where o.id = okr_key_results.objective_id
      and public.can_manage_okr_scope(o.company_id, o.okr_level, o.department_id)
  )
);
create policy okr_key_results_delete_scope on public.okr_key_results
for delete to authenticated
using (
  exists (
    select 1
    from public.okr_objectives o
    where o.id = okr_key_results.objective_id
      and public.can_manage_okr_scope(o.company_id, o.okr_level, o.department_id)
  )
);

drop policy if exists okr_deliverables_select on public.okr_deliverables;
drop policy if exists okr_deliverables_write_owner_or_admin on public.okr_deliverables;
create policy okr_deliverables_select on public.okr_deliverables
for select to authenticated
using (
  exists (
    select 1
    from public.okr_key_results kr
    join public.okr_objectives o on o.id = kr.objective_id
    where kr.id = okr_deliverables.key_result_id
      and public.can_view_okr_scope(o.company_id, o.okr_level, o.department_id, o.owner_user_id)
  )
);
create policy okr_deliverables_insert_scope on public.okr_deliverables
for insert to authenticated
with check (
  exists (
    select 1
    from public.okr_key_results kr
    join public.okr_objectives o on o.id = kr.objective_id
    where kr.id = okr_deliverables.key_result_id
      and public.can_manage_okr_scope(o.company_id, o.okr_level, coalesce(okr_deliverables.department_id, o.department_id))
  )
);
create policy okr_deliverables_update_scope on public.okr_deliverables
for update to authenticated
using (
  exists (
    select 1
    from public.okr_key_results kr
    join public.okr_objectives o on o.id = kr.objective_id
    where kr.id = okr_deliverables.key_result_id
      and public.can_manage_okr_scope(o.company_id, o.okr_level, coalesce(okr_deliverables.department_id, o.department_id))
  )
)
with check (
  exists (
    select 1
    from public.okr_key_results kr
    join public.okr_objectives o on o.id = kr.objective_id
    where kr.id = okr_deliverables.key_result_id
      and public.can_manage_okr_scope(o.company_id, o.okr_level, coalesce(okr_deliverables.department_id, o.department_id))
  )
);
create policy okr_deliverables_delete_scope on public.okr_deliverables
for delete to authenticated
using (
  exists (
    select 1
    from public.okr_key_results kr
    join public.okr_objectives o on o.id = kr.objective_id
    where kr.id = okr_deliverables.key_result_id
      and public.can_manage_okr_scope(o.company_id, o.okr_level, coalesce(okr_deliverables.department_id, o.department_id))
  )
);

drop policy if exists projects_select_policy on public.projects;
drop policy if exists projects_insert_policy on public.projects;
drop policy if exists projects_update_policy on public.projects;
drop policy if exists projects_delete_policy on public.projects;
create policy projects_select_policy on public.projects
for select to authenticated
using (public.can_view_project(id, tenant_id, owner_user_id, department_id, department_ids));
create policy projects_insert_policy on public.projects
for insert to authenticated
with check (public.can_manage_project(tenant_id, department_id, department_ids));
create policy projects_update_policy on public.projects
for update to authenticated
using (public.can_manage_project(tenant_id, department_id, department_ids))
with check (public.can_manage_project(tenant_id, department_id, department_ids));
create policy projects_delete_policy on public.projects
for delete to authenticated
using (public.can_manage_project(tenant_id, department_id, department_ids));

drop policy if exists project_members_select_policy on public.project_members;
drop policy if exists project_members_insert_policy on public.project_members;
drop policy if exists project_members_update_policy on public.project_members;
drop policy if exists project_members_delete_policy on public.project_members;
create policy project_members_select_policy on public.project_members
for select to authenticated
using (
  user_id = auth.uid()
  or exists (
    select 1
    from public.projects p
    where p.id = project_members.project_id
      and p.tenant_id = project_members.tenant_id
      and public.can_view_project(p.id, p.tenant_id, p.owner_user_id, p.department_id, p.department_ids)
  )
);
create policy project_members_insert_policy on public.project_members
for insert to authenticated
with check (
  exists (
    select 1
    from public.projects p
    where p.id = project_members.project_id
      and p.tenant_id = project_members.tenant_id
      and public.can_manage_project(p.tenant_id, p.department_id, p.department_ids)
  )
);
create policy project_members_update_policy on public.project_members
for update to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_members.project_id
      and p.tenant_id = project_members.tenant_id
      and public.can_manage_project(p.tenant_id, p.department_id, p.department_ids)
  )
)
with check (
  exists (
    select 1
    from public.projects p
    where p.id = project_members.project_id
      and p.tenant_id = project_members.tenant_id
      and public.can_manage_project(p.tenant_id, p.department_id, p.department_ids)
  )
);
create policy project_members_delete_policy on public.project_members
for delete to authenticated
using (
  exists (
    select 1
    from public.projects p
    where p.id = project_members.project_id
      and p.tenant_id = project_members.tenant_id
      and public.can_manage_project(p.tenant_id, p.department_id, p.department_ids)
  )
);

drop policy if exists work_items_select_policy on public.work_items;
drop policy if exists work_items_insert_policy on public.work_items;
drop policy if exists work_items_update_permissive on public.work_items;
drop policy if exists work_items_delete_policy on public.work_items;
create policy work_items_select_policy on public.work_items
for select to authenticated
using (
  assignee_user_id = auth.uid()
  or exists (
    select 1
    from public.projects p
    where p.id = work_items.project_id
      and p.tenant_id = work_items.tenant_id
      and public.can_view_project(p.id, p.tenant_id, p.owner_user_id, p.department_id, p.department_ids)
  )
);
create policy work_items_insert_policy on public.work_items
for insert to authenticated
with check (
  exists (
    select 1
    from public.projects p
    where p.id = work_items.project_id
      and p.tenant_id = work_items.tenant_id
      and (
        public.can_manage_project(p.tenant_id, p.department_id, p.department_ids)
        or p.owner_user_id = auth.uid()
        or exists (
          select 1
          from public.project_members pm
          where pm.project_id = p.id
            and pm.user_id = auth.uid()
        )
      )
  )
);
create policy work_items_update_policy on public.work_items
for update to authenticated
using (
  created_by_user_id = auth.uid()
  or assignee_user_id = auth.uid()
  or exists (
    select 1
    from public.projects p
    where p.id = work_items.project_id
      and p.tenant_id = work_items.tenant_id
      and (
        public.can_manage_project(p.tenant_id, p.department_id, p.department_ids)
        or p.owner_user_id = auth.uid()
        or exists (
          select 1
          from public.project_members pm
          where pm.project_id = p.id
            and pm.user_id = auth.uid()
        )
      )
  )
)
with check (
  created_by_user_id = auth.uid()
  or assignee_user_id = auth.uid()
  or exists (
    select 1
    from public.projects p
    where p.id = work_items.project_id
      and p.tenant_id = work_items.tenant_id
      and (
        public.can_manage_project(p.tenant_id, p.department_id, p.department_ids)
        or p.owner_user_id = auth.uid()
        or exists (
          select 1
          from public.project_members pm
          where pm.project_id = p.id
            and pm.user_id = auth.uid()
        )
      )
  )
);
create policy work_items_delete_policy on public.work_items
for delete to authenticated
using (
  created_by_user_id = auth.uid()
  or exists (
    select 1
    from public.projects p
    where p.id = work_items.project_id
      and p.tenant_id = work_items.tenant_id
      and (
        public.can_manage_project(p.tenant_id, p.department_id, p.department_ids)
        or p.owner_user_id = auth.uid()
        or exists (
          select 1
          from public.project_members pm
          where pm.project_id = p.id
            and pm.user_id = auth.uid()
        )
      )
  )
);

create or replace view public.okrs as
select
  id,
  company_id as tenant_id,
  title,
  description,
  okr_level as level,
  parent_objective_id as parent_okr_id,
  department_id,
  owner_user_id,
  status,
  due_at as due_date,
  created_at,
  updated_at
from public.okr_objectives;

create or replace view public.key_results as
select
  kr.id,
  o.company_id as tenant_id,
  kr.objective_id as okr_id,
  kr.title,
  kr.description,
  kr.owner_user_id,
  kr.kind as metric_type,
  kr.start_value,
  kr.target_value,
  kr.current_value,
  case
    when kr.achieved then 'achieved'
    when kr.confidence = 'OFF_TRACK' then 'off_track'
    when kr.confidence = 'AT_RISK' then 'at_risk'
    else 'active'
  end as status,
  kr.due_at as due_date,
  kr.created_at,
  kr.updated_at
from public.okr_key_results kr
join public.okr_objectives o on o.id = kr.objective_id;

commit;