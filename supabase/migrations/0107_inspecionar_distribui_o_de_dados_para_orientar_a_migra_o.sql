select 'okr_objectives_levels' as section, json_agg(x) as data from (
  select level, tier, count(*) as count
  from public.okr_objectives
  group by level, tier
  order by level, tier
) x
union all
select 'deliverables', json_agg(x) from (
  select tier, status, count(*) as count
  from public.okr_deliverables
  group by tier, status
  order by tier, status
) x
union all
select 'projects_shape', json_agg(x) from (
  select count(*) as total_projects,
         count(*) filter (where department_id is not null) as with_department_id,
         count(*) filter (where department_ids is not null and array_length(department_ids,1) > 0) as with_department_ids,
         count(*) filter (where department_id is not null and department_id !~ '^[0-9a-f-]{36}$') as department_id_not_uuid_text
  from public.projects
) x;