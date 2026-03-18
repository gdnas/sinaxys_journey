create or replace function public.ensure_project_tenant_coherence()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  owner_company uuid;
  creator_company uuid;
  key_result_company uuid;
  deliverable_company uuid;
  deliverable_key_result_id uuid;
begin
  perform set_config('row_security', 'off', true);

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
security definer
set search_path to 'public'
as $$
declare
  resolved_department_id uuid;
begin
  perform set_config('row_security', 'off', true);

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