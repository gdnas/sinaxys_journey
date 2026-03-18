with target_user as (
  select id as user_id, company_id
  from public.profiles
  where id = '67acbc23-10a2-4424-b033-36e6985f7ad1'
),
project_sample as (
  select p.id as project_id,
         p.tenant_id,
         p.key_result_id,
         p.deliverable_id,
         p.name as project_name,
         p.owner_user_id,
         p.department_id,
         p.department_ids
  from public.projects p
  join target_user tu on tu.company_id = p.tenant_id
  order by p.created_at desc
  limit 3
)
select row_to_json(project_sample) as sample from project_sample;