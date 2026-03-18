-- 1) Expand work_items to fully represent OKR execution
alter table public.work_items
  add column if not exists key_result_id uuid references public.okr_key_results(id) on delete set null,
  add column if not exists deliverable_id uuid references public.okr_deliverables(id) on delete set null,
  add column if not exists estimate_minutes integer,
  add column if not exists checklist jsonb,
  add column if not exists estimated_value_brl numeric,
  add column if not exists estimated_cost_brl numeric,
  add column if not exists estimated_roi_pct numeric,
  add column if not exists legacy_okr_task_id uuid;

create unique index if not exists work_items_legacy_okr_task_id_uq
  on public.work_items (legacy_okr_task_id)
  where legacy_okr_task_id is not null;

create index if not exists work_items_key_result_id_idx on public.work_items (key_result_id);
create index if not exists work_items_deliverable_id_idx on public.work_items (deliverable_id);
create index if not exists work_items_project_id_idx on public.work_items (project_id);
create index if not exists work_items_parent_id_idx on public.work_items (parent_id);
create index if not exists work_items_assignee_user_id_idx on public.work_items (assignee_user_id);

-- 2) Helper functions for access and coherence
create or replace function public.can_view_work_item(p_work_item_id uuid)
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
  wi record;
  okr record;
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

  select wi.id, wi.tenant_id, wi.project_id, wi.assignee_user_id, wi.created_by_user_id,
         wi.key_result_id, wi.deliverable_id,
         p.owner_user_id as project_owner_user_id,
         p.department_id as project_department_id,
         p.department_ids as project_department_ids
    into wi
  from public.work_items wi
  left join public.projects p on p.id = wi.project_id
  where wi.id = p_work_item_id;

  if wi.id is null then
    return false;
  end if;

  if v_company_id is null or wi.tenant_id <> v_company_id then
    return false;
  end if;

  if wi.assignee_user_id = auth.uid() or wi.created_by_user_id = auth.uid() then
    return true;
  end if;

  if wi.project_id is not null then
    return public.can_view_project(
      wi.project_id,
      wi.tenant_id,
      wi.project_owner_user_id,
      wi.project_department_id,
      wi.project_department_ids
    );
  end if;

  if wi.deliverable_id is not null or wi.key_result_id is not null then
    select o.company_id, o.okr_level, o.department_id, o.owner_user_id
      into okr
    from public.okr_key_results kr
    join public.okr_objectives o on o.id = kr.objective_id
    where kr.id = coalesce(
      wi.key_result_id,
      (select d.key_result_id from public.okr_deliverables d where d.id = wi.deliverable_id)
    );

    if okr.company_id is null then
      return false;
    end if;

    return public.can_view_okr_scope(okr.company_id, okr.okr_level, okr.department_id, okr.owner_user_id);
  end if;

  return false;
end;
$$;

create or replace function public.can_manage_work_item(p_work_item_id uuid)
returns boolean
language plpgsql
stable
security definer
set search_path to 'public'
as $$
declare
  v_role text;
  v_company_id uuid;
  wi record;
  okr record;
begin
  if auth.uid() is null then
    return false;
  end if;

  perform set_config('row_security', 'off', true);

  select role, company_id
    into v_role, v_company_id
  from public.profiles
  where id = auth.uid();

  if v_role = 'MASTERADMIN' then
    return true;
  end if;

  select wi.id, wi.tenant_id, wi.project_id, wi.assignee_user_id, wi.created_by_user_id,
         wi.key_result_id, wi.deliverable_id,
         p.owner_user_id as project_owner_user_id,
         p.department_id as project_department_id,
         p.department_ids as project_department_ids
    into wi
  from public.work_items wi
  left join public.projects p on p.id = wi.project_id
  where wi.id = p_work_item_id;

  if wi.id is null then
    return false;
  end if;

  if v_company_id is null or wi.tenant_id <> v_company_id then
    return false;
  end if;

  if wi.assignee_user_id = auth.uid() or wi.created_by_user_id = auth.uid() then
    return true;
  end if;

  if wi.project_id is not null then
    if public.can_manage_project(wi.tenant_id, wi.project_department_id, wi.project_department_ids) then
      return true;
    end if;

    if wi.project_owner_user_id = auth.uid() then
      return true;
    end if;

    if exists (
      select 1
      from public.project_members pm
      where pm.project_id = wi.project_id
        and pm.user_id = auth.uid()
    ) then
      return true;
    end if;
  end if;

  if wi.deliverable_id is not null or wi.key_result_id is not null then
    select o.company_id, o.okr_level, o.department_id
      into okr
    from public.okr_key_results kr
    join public.okr_objectives o on o.id = kr.objective_id
    where kr.id = coalesce(
      wi.key_result_id,
      (select d.key_result_id from public.okr_deliverables d where d.id = wi.deliverable_id)
    );

    if okr.company_id is not null and public.can_manage_okr_scope(okr.company_id, okr.okr_level, okr.department_id) then
      return true;
    end if;
  end if;

  return false;
end;
$$;

create or replace function public.can_create_work_item(
  p_tenant_id uuid,
  p_project_id uuid,
  p_key_result_id uuid,
  p_deliverable_id uuid,
  p_assignee_user_id uuid,
  p_created_by_user_id uuid
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
  v_project record;
  v_okr record;
  v_effective_key_result_id uuid;
begin
  if auth.uid() is null then
    return false;
  end if;

  perform set_config('row_security', 'off', true);

  select role, company_id into v_role, v_company_id
  from public.profiles
  where id = auth.uid();

  if v_role = 'MASTERADMIN' then
    return true;
  end if;

  if v_company_id is null or v_company_id <> p_tenant_id then
    return false;
  end if;

  if p_created_by_user_id is distinct from auth.uid() then
    return false;
  end if;

  if p_project_id is not null then
    select id, tenant_id, owner_user_id, department_id, department_ids
      into v_project
    from public.projects
    where id = p_project_id;

    if v_project.id is null or v_project.tenant_id <> p_tenant_id then
      return false;
    end if;

    return public.can_manage_project(v_project.tenant_id, v_project.department_id, v_project.department_ids)
      or v_project.owner_user_id = auth.uid()
      or exists (
        select 1
        from public.project_members pm
        where pm.project_id = v_project.id
          and pm.user_id = auth.uid()
      );
  end if;

  v_effective_key_result_id := coalesce(
    p_key_result_id,
    (select d.key_result_id from public.okr_deliverables d where d.id = p_deliverable_id)
  );

  if v_effective_key_result_id is null then
    return false;
  end if;

  select o.company_id, o.okr_level, o.department_id, o.owner_user_id
    into v_okr
  from public.okr_key_results kr
  join public.okr_objectives o on o.id = kr.objective_id
  where kr.id = v_effective_key_result_id;

  if v_okr.company_id is null or v_okr.company_id <> p_tenant_id then
    return false;
  end if;

  if public.can_manage_okr_scope(v_okr.company_id, v_okr.okr_level, v_okr.department_id) then
    return true;
  end if;

  return coalesce(p_assignee_user_id, auth.uid()) = auth.uid()
    and public.can_view_okr_scope(v_okr.company_id, v_okr.okr_level, v_okr.department_id, v_okr.owner_user_id);
end;
$$;

create or replace function public.ensure_work_item_tenant_coherence()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  proj record;
  assignee_company uuid;
  creator_company uuid;
  parent_item record;
  key_result_company uuid;
  deliverable_company uuid;
  deliverable_key_result_id uuid;
begin
  perform set_config('row_security', 'off', true);

  if new.project_id is not null then
    select id, tenant_id, key_result_id, deliverable_id
      into proj
    from public.projects
    where id = new.project_id;

    if proj.id is null then
      raise exception 'work_item.project not found';
    end if;

    if proj.tenant_id <> new.tenant_id then
      raise exception 'work_item.project belongs to different tenant';
    end if;
  end if;

  if new.assignee_user_id is not null then
    select company_id::uuid into assignee_company
    from public.profiles
    where id = new.assignee_user_id;

    if assignee_company is not null and assignee_company <> new.tenant_id then
      raise exception 'work_item.assignee belongs to different tenant';
    end if;
  end if;

  if new.created_by_user_id is not null then
    select company_id::uuid into creator_company
    from public.profiles
    where id = new.created_by_user_id;

    if creator_company is not null and creator_company <> new.tenant_id then
      raise exception 'work_item.created_by belongs to different tenant';
    end if;
  end if;

  if new.parent_id is not null then
    select id, tenant_id, project_id, key_result_id, deliverable_id
      into parent_item
    from public.work_items
    where id = new.parent_id;

    if parent_item.id is null then
      raise exception 'work_item.parent not found';
    end if;

    if parent_item.tenant_id <> new.tenant_id then
      raise exception 'work_item.parent belongs to different tenant';
    end if;

    if new.project_id is null then
      new.project_id := parent_item.project_id;
    elsif parent_item.project_id is not null and new.project_id <> parent_item.project_id then
      raise exception 'work_item.parent project mismatch';
    end if;

    if new.key_result_id is null then
      new.key_result_id := parent_item.key_result_id;
    elsif parent_item.key_result_id is not null and new.key_result_id <> parent_item.key_result_id then
      raise exception 'work_item.parent key_result mismatch';
    end if;

    if new.deliverable_id is null then
      new.deliverable_id := parent_item.deliverable_id;
    elsif parent_item.deliverable_id is not null and new.deliverable_id <> parent_item.deliverable_id then
      raise exception 'work_item.parent deliverable mismatch';
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
      raise exception 'work_item.deliverable not found';
    end if;

    if deliverable_company <> new.tenant_id then
      raise exception 'work_item.deliverable belongs to different tenant';
    end if;

    if new.key_result_id is null then
      new.key_result_id := deliverable_key_result_id;
    elsif new.key_result_id <> deliverable_key_result_id then
      raise exception 'work_item.deliverable does not belong to key_result';
    end if;
  end if;

  if new.key_result_id is not null then
    select o.company_id::uuid
      into key_result_company
    from public.okr_key_results kr
    join public.okr_objectives o on o.id = kr.objective_id
    where kr.id = new.key_result_id;

    if key_result_company is null then
      raise exception 'work_item.key_result not found';
    end if;

    if key_result_company <> new.tenant_id then
      raise exception 'work_item.key_result belongs to different tenant';
    end if;
  end if;

  if proj.id is not null then
    if new.key_result_id is null then
      new.key_result_id := proj.key_result_id;
    elsif proj.key_result_id is not null and new.key_result_id <> proj.key_result_id then
      raise exception 'work_item.key_result must match project.key_result';
    end if;

    if new.deliverable_id is null then
      new.deliverable_id := proj.deliverable_id;
    elsif proj.deliverable_id is not null and new.deliverable_id <> proj.deliverable_id then
      raise exception 'work_item.deliverable must match project.deliverable';
    end if;
  end if;

  return new;
end;
$$;

-- 3) Replace OKR RPCs so the backend no longer depends on okr_tasks
create or replace function public.okr_tasks_for_company(p_company_id uuid, p_from date default null::date, p_to date default null::date)
returns table(
  id uuid,
  deliverable_id uuid,
  title text,
  description text,
  owner_user_id uuid,
  status text,
  due_date date,
  estimate_minutes integer,
  checklist jsonb,
  completed_at timestamp with time zone,
  estimated_value_brl numeric,
  estimated_cost_brl numeric,
  estimated_roi_pct numeric,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  objective_id uuid,
  objective_title text,
  objective_level text,
  department_id uuid
)
language sql
stable
as $$
  select
    wi.id,
    wi.deliverable_id,
    wi.title,
    wi.description,
    coalesce(wi.assignee_user_id, wi.created_by_user_id) as owner_user_id,
    wi.status,
    wi.due_date::date,
    wi.estimate_minutes,
    wi.checklist,
    wi.completed_at,
    wi.estimated_value_brl,
    wi.estimated_cost_brl,
    wi.estimated_roi_pct,
    wi.created_at,
    wi.updated_at,
    o.id as objective_id,
    o.title as objective_title,
    o.level as objective_level,
    o.department_id
  from public.work_items wi
  join public.okr_key_results kr on kr.id = wi.key_result_id
  join public.okr_objectives o on o.id = kr.objective_id
  where wi.tenant_id = p_company_id
    and (p_from is null or wi.due_date::date >= p_from)
    and (p_to is null or wi.due_date::date <= p_to);
$$;

create or replace function public.okr_tasks_for_department(p_company_id uuid, p_department_id uuid, p_from date default null::date, p_to date default null::date)
returns table(
  id uuid,
  deliverable_id uuid,
  title text,
  description text,
  owner_user_id uuid,
  status text,
  due_date date,
  estimate_minutes integer,
  checklist jsonb,
  completed_at timestamp with time zone,
  estimated_value_brl numeric,
  estimated_cost_brl numeric,
  estimated_roi_pct numeric,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  objective_id uuid,
  objective_title text,
  objective_level text,
  department_id uuid
)
language sql
stable
as $$
  select
    wi.id,
    wi.deliverable_id,
    wi.title,
    wi.description,
    coalesce(wi.assignee_user_id, wi.created_by_user_id) as owner_user_id,
    wi.status,
    wi.due_date::date,
    wi.estimate_minutes,
    wi.checklist,
    wi.completed_at,
    wi.estimated_value_brl,
    wi.estimated_cost_brl,
    wi.estimated_roi_pct,
    wi.created_at,
    wi.updated_at,
    o.id as objective_id,
    o.title as objective_title,
    o.level as objective_level,
    o.department_id
  from public.work_items wi
  join public.okr_key_results kr on kr.id = wi.key_result_id
  join public.okr_objectives o on o.id = kr.objective_id
  where wi.tenant_id = p_company_id
    and o.department_id = p_department_id
    and (p_from is null or wi.due_date::date >= p_from)
    and (p_to is null or wi.due_date::date <= p_to);
$$;

create or replace function public.okr_tasks_for_user(p_user_id uuid, p_from date default null::date, p_to date default null::date)
returns table(
  id uuid,
  deliverable_id uuid,
  title text,
  description text,
  owner_user_id uuid,
  status text,
  due_date date,
  estimate_minutes integer,
  checklist jsonb,
  completed_at timestamp with time zone,
  estimated_value_brl numeric,
  estimated_cost_brl numeric,
  estimated_roi_pct numeric,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  objective_id uuid,
  objective_title text,
  objective_level text,
  department_id uuid
)
language sql
stable
as $$
  select
    wi.id,
    wi.deliverable_id,
    wi.title,
    wi.description,
    coalesce(wi.assignee_user_id, wi.created_by_user_id) as owner_user_id,
    wi.status,
    wi.due_date::date,
    wi.estimate_minutes,
    wi.checklist,
    wi.completed_at,
    wi.estimated_value_brl,
    wi.estimated_cost_brl,
    wi.estimated_roi_pct,
    wi.created_at,
    wi.updated_at,
    o.id as objective_id,
    o.title as objective_title,
    o.level as objective_level,
    o.department_id
  from public.work_items wi
  join public.okr_key_results kr on kr.id = wi.key_result_id
  join public.okr_objectives o on o.id = kr.objective_id
  where wi.assignee_user_id = p_user_id
    and (p_from is null or wi.due_date::date >= p_from)
    and (p_to is null or wi.due_date::date <= p_to)
  order by wi.due_date asc nulls last, wi.created_at desc;
$$;

create or replace function public.okr_tasks_for_user_v2(p_user_id uuid, p_from date default null::date, p_to date default null::date)
returns table(
  id uuid,
  deliverable_id uuid,
  title text,
  description text,
  owner_user_id uuid,
  status text,
  due_date date,
  estimate_minutes integer,
  checklist jsonb,
  completed_at timestamp with time zone,
  estimated_value_brl numeric,
  estimated_cost_brl numeric,
  estimated_roi_pct numeric,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  objective_id uuid,
  objective_title text,
  objective_level text,
  department_id uuid,
  deliverable_title text,
  key_result_id uuid,
  key_result_title text,
  key_result_kind text,
  cycle_id uuid,
  cycle_type text,
  cycle_year integer,
  cycle_quarter integer
)
language sql
stable
as $$
  select
    wi.id,
    wi.deliverable_id,
    wi.title,
    wi.description,
    coalesce(wi.assignee_user_id, wi.created_by_user_id) as owner_user_id,
    wi.status,
    wi.due_date::date,
    wi.estimate_minutes,
    wi.checklist,
    wi.completed_at,
    wi.estimated_value_brl,
    wi.estimated_cost_brl,
    wi.estimated_roi_pct,
    wi.created_at,
    wi.updated_at,
    o.id as objective_id,
    o.title as objective_title,
    o.level as objective_level,
    o.department_id,
    d.title as deliverable_title,
    kr.id as key_result_id,
    kr.title as key_result_title,
    kr.kind as key_result_kind,
    c.id as cycle_id,
    c.type as cycle_type,
    c.year as cycle_year,
    c.quarter as cycle_quarter
  from public.work_items wi
  join public.okr_key_results kr on kr.id = wi.key_result_id
  join public.okr_objectives o on o.id = kr.objective_id
  join public.okr_cycles c on c.id = o.cycle_id
  left join public.okr_deliverables d on d.id = wi.deliverable_id
  where wi.assignee_user_id = p_user_id
    and (p_from is null or wi.due_date::date >= p_from)
    and (p_to is null or wi.due_date::date <= p_to)
  order by wi.due_date asc nulls last, wi.created_at desc;
$$;