select p.id as user_id, p.company_id, p.role, p.name, p.email,
       exists (
         select 1
         from public.okr_deliverables d
         join public.okr_key_results kr on kr.id = d.key_result_id
         join public.okr_objectives o on o.id = kr.objective_id
         where o.company_id = p.company_id
       ) as has_okr,
       exists (
         select 1 from public.projects pr where pr.tenant_id = p.company_id
       ) as has_projects
from public.profiles p
where p.role in ('ADMIN','HEAD','MASTERADMIN')
  and p.active = true
order by p.company_id, p.role;