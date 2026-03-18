select id, company_id, role, name, email
from public.profiles
where active = true
  and company_id is not null
order by updated_at desc nulls last, created_at desc nulls last
limit 10;