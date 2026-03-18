CREATE OR REPLACE FUNCTION public.can_view_work_item(p_work_item_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_role text;
  v_company_id uuid;
  v_department_id uuid;
  v_work_item record;
  v_okr record;
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

  select w.id,
         w.tenant_id,
         w.project_id,
         w.assignee_user_id,
         w.created_by_user_id,
         w.key_result_id,
         w.deliverable_id,
         p.owner_user_id as project_owner_user_id,
         p.department_id as project_department_id,
         p.department_ids as project_department_ids
    into v_work_item
  from public.work_items w
  left join public.projects p on p.id = w.project_id
  where w.id = p_work_item_id;

  if v_work_item.id is null then
    return false;
  end if;

  if v_company_id is null or v_work_item.tenant_id <> v_company_id then
    return false;
  end if;

  if v_work_item.assignee_user_id = auth.uid() or v_work_item.created_by_user_id = auth.uid() then
    return true;
  end if;

  if v_work_item.project_id is not null then
    return public.can_view_project(
      v_work_item.project_id,
      v_work_item.tenant_id,
      v_work_item.project_owner_user_id,
      v_work_item.project_department_id,
      v_work_item.project_department_ids
    );
  end if;

  if v_work_item.deliverable_id is not null or v_work_item.key_result_id is not null then
    select o.company_id, o.okr_level, o.department_id, o.owner_user_id
      into v_okr
    from public.okr_key_results kr
    join public.okr_objectives o on o.id = kr.objective_id
    where kr.id = coalesce(
      v_work_item.key_result_id,
      (select d.key_result_id from public.okr_deliverables d where d.id = v_work_item.deliverable_id)
    );

    if v_okr.company_id is null then
      return false;
    end if;

    return public.can_view_okr_scope(v_okr.company_id, v_okr.okr_level, v_okr.department_id, v_okr.owner_user_id);
  end if;

  return false;
end;
$function$;

CREATE OR REPLACE FUNCTION public.can_manage_work_item(p_work_item_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_role text;
  v_company_id uuid;
  v_work_item record;
  v_okr record;
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

  select w.id,
         w.tenant_id,
         w.project_id,
         w.assignee_user_id,
         w.created_by_user_id,
         w.key_result_id,
         w.deliverable_id,
         p.owner_user_id as project_owner_user_id,
         p.department_id as project_department_id,
         p.department_ids as project_department_ids
    into v_work_item
  from public.work_items w
  left join public.projects p on p.id = w.project_id
  where w.id = p_work_item_id;

  if v_work_item.id is null then
    return false;
  end if;

  if v_company_id is null or v_work_item.tenant_id <> v_company_id then
    return false;
  end if;

  if v_work_item.assignee_user_id = auth.uid() or v_work_item.created_by_user_id = auth.uid() then
    return true;
  end if;

  if v_work_item.project_id is not null then
    if public.can_manage_project(v_work_item.tenant_id, v_work_item.project_department_id, v_work_item.project_department_ids) then
      return true;
    end if;

    if v_work_item.project_owner_user_id = auth.uid() then
      return true;
    end if;

    if exists (
      select 1
      from public.project_members pm
      where pm.project_id = v_work_item.project_id
        and pm.user_id = auth.uid()
    ) then
      return true;
    end if;
  end if;

  if v_work_item.deliverable_id is not null or v_work_item.key_result_id is not null then
    select o.company_id, o.okr_level, o.department_id
      into v_okr
    from public.okr_key_results kr
    join public.okr_objectives o on o.id = kr.objective_id
    where kr.id = coalesce(
      v_work_item.key_result_id,
      (select d.key_result_id from public.okr_deliverables d where d.id = v_work_item.deliverable_id)
    );

    if v_okr.company_id is not null and public.can_manage_okr_scope(v_okr.company_id, v_okr.okr_level, v_okr.department_id) then
      return true;
    end if;
  end if;

  return false;
end;
$function$;