select 'okr_objectives_level_counts' as section, json_agg(x) as data
from (
  select level, tier, count(*) as count
  from public.okr_objectives
  group by level, tier
  order by level, tier
) x
union all
select 'okr_key_results_count', json_agg(x) from (
  select kind, confidence, count(*) as count from public.okr_key_results group by kind, confidence order by kind, confidence
) x
union all
select 'projects_department_shape', json_agg(x) from (
  select 
    count(*) filter (where department_id is not null) as with_department_id,
    count(*) filter (where department_ids is not null and array_length(department_ids,1) > 0) as with_department_ids,
    count(*) filter (where department_id is null and (department_ids is null or array_length(department_ids,1)=0)) as without_department
  from public.projects
) x
union all
select 'okr_deliverables_count', json_agg(x) from (
  select tier, status, count(*) as count from public.okr_deliverables group by tier, status order by tier, status
) x;