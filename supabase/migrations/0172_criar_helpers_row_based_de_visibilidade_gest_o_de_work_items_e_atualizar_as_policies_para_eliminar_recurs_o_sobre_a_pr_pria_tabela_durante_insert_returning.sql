CREATE OR REPLACE FUNCTION public.can_view_work_item_row(
  p_tenant_id uuid,
  p_project_id uuid,
  p_assignee_user_id uuid,
  p_created_by_user_id uuid,
  p_key_result_id uuid,
  p_deliverable_id uuid
)
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
  v_project record;
  v_okr record;
  v_effective_key_result_id uuid;
begin
  if auth.uid() is null then
    return false;
  end if;

  select role, company_id, department_id
    into v_role, v_company_id, v_department_id
  from public.profiles
  where id = auth.uid();

  if v_role = 'MASTERADMIN' then
    return true;
  end if;

  if v_company_id is null or p_tenant_id <> v_company_id then
    return false;
  end if;

  if p_assignee_user_id = auth.uid() or p_created_by_user_id = auth.uid() then
    return true;
  end if;

  if p_project_id is not null then
    select owner_user_id, department_id, department_ids
      into v_project
    from public.projects
    where id = p_project_id
      and tenant_id = p_tenant_id;

    if v_project.owner_user_id is null then
      return false;
    end if;

    return public.can_view_project(
      p_project_id,
      p_tenant_id,
      v_project.owner_user_id,
      v_project.department_id,
      v_project.department_ids
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

  if v_okr.company_id is null then
    return false;
  end if;

  return public.can_view_okr_scope(v_okr.company_id, v_okr.okr_level, v_okr.department_id, v_okr.owner_user_id);
end;
$function$;

CREATE OR REPLACE FUNCTION public.can_manage_work_item_row(
  p_tenant_id uuid,
  p_project_id uuid,
  p_assignee_user_id uuid,
  p_created_by_user_id uuid,
  p_key_result_id uuid,
  p_deliverable_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
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

  select role, company_id
    into v_role, v_company_id
  from public.profiles
  where id = auth.uid();

  if v_role = 'MASTERADMIN' then
    return true;
  end if;

  if v_company_id is null or p_tenant_id <> v_company_id then
    return false;
  end if;

  if p_assignee_user_id = auth.uid() or p_created_by_user_id = auth.uid() then
    return true;
  end if;

  if p_project_id is not null then
    select owner_user_id, department_id, department_ids
      into v_project
    from public.projects
    where id = p_project_id
      and tenant_id = p_tenant_id;

    if v_project.owner_user_id is null then
      return false;
    end if;

    if public.can_manage_project(p_tenant_id, v_project.department_id, v_project.department_ids) then
      return true;
    end if;

    if v_project.owner_user_id = auth.uid() then
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

    return false;
  end if;

  v_effective_key_result_id := coalesce(
    p_key_result_id,
    (select d.key_result_id from public.okr_deliverables d where d.id = p_deliverable_id)
  );

  if v_effective_key_result_id is null then
    return false;
  end if;

  select o.company_id, o.okr_level, o.department_id
    into v_okr
  from public.okr_key_results kr
  join public.okr_objectives o on o.id = kr.objective_id
  where kr.id = v_effective_key_result_id;

  if v_okr.company_id is null then
    return false;
  end if;

  return public.can_manage_okr_scope(v_okr.company_id, v_okr.okr_level, v_okr.department_id);
end;
$function$;

DROP POLICY IF EXISTS work_items_select_policy ON public.work_items;
CREATE POLICY work_items_select_policy
ON public.work_items
FOR SELECT
USING (
  public.can_view_work_item_row(
    tenant_id,
    project_id,
    assignee_user_id,
    created_by_user_id,
    key_result_id,
    deliverable_id
  )
);

DROP POLICY IF EXISTS work_items_update_policy ON public.work_items;
CREATE POLICY work_items_update_policy
ON public.work_items
FOR UPDATE
USING (
  public.can_manage_work_item_row(
    tenant_id,
    project_id,
    assignee_user_id,
    created_by_user_id,
    key_result_id,
    deliverable_id
  )
)
WITH CHECK (
  public.can_manage_work_item_row(
    tenant_id,
    project_id,
    assignee_user_id,
    created_by_user_id,
    key_result_id,
    deliverable_id
  )
);

DROP POLICY IF EXISTS work_items_delete_policy ON public.work_items;
CREATE POLICY work_items_delete_policy
ON public.work_items
FOR DELETE
USING (
  public.can_manage_work_item_row(
    tenant_id,
    project_id,
    assignee_user_id,
    created_by_user_id,
    key_result_id,
    deliverable_id
  )
);