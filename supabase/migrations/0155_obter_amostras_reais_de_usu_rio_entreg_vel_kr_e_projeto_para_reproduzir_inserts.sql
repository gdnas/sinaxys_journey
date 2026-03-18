with admin_user as (
  select id as user_id, company_id, role, name, email
  from public.profiles
  where active = true
    and role in ('ADMIN','MASTERADMIN')
    and company_id is not null
  order by updated_at desc nulls last, created_at desc nulls last
  limit 1
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
  where o.company_id is not null
  order by d.created_at desc
  limit 1
),
project_sample as (
  select p.id as project_id,
         p.tenant_id,
         p.key_result_id,
         p.deliverable_id,
         p.name as project_name
  from public.projects p
  where p.tenant_id is not null
  order by p.created_at desc
  limit 1
)
select * from admin_user, okr_sample, project_sample;