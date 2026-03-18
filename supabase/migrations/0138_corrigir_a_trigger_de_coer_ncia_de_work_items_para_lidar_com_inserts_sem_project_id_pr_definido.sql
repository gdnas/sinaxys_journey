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