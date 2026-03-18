with target_user as (
  select id as user_id, company_id, role, name, email
  from public.profiles
  where id = 'd9068441-409a-44e7-96a2-40e1859c431e'
),
okr_sample as (
  select d.id as deliverable_id,
         d.key_result_id,
         o.company_id,
         o.okr_level,
         o.department_id,
         o.owner_user_id,
         d.title as deliverable_title,
         kr.title as key_result_title,
         o.title as objective_title
  from public.okr_deliverables d
  join public.okr_key_results kr on kr.id = d.key_result_id
  join public.okr_objectives o on o.id = kr.objective_id
  join target_user tu on tu.company_id = o.company_id
  order by d.created_at desc
  limit 5
),
project_sample as (
  select p.id as project_id,
         p.tenant_id,
         p.key_result_id,
         p.deliverable_id,
         p.name as project_name
  from public.projects p
  join target_user tu on tu.company_id = p.tenant_id
  order by p.created_at desc
  limit 5
)
select 'okr' as sample_type, row_to_json(okr_sample) as sample from okr_sample
union all
select 'project' as sample_type, row_to_json(project_sample) as sample from project_sample;