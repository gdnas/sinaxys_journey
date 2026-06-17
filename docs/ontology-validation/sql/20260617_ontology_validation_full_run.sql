with eligible_profiles as (
  select
    p.id,
    p.company_id
  from profiles p
  join users u on u.id = p.user_id
  where u.email not like '%@thoughtworks.com'
  and p.deleted_at is null
),
chosen_primary_tenant as (
  select
    company_id
  from eligible_profiles
  group by company_id
  order by count(*) desc
  limit 1
),
secondary_tenant as (
  select
    ep.company_id,
    (array_agg(ep.id order by ep.id))[1] as outsider_user_id
  from eligible_profiles ep
  where ep.company_id <> (select company_id from chosen_primary_tenant)
  group by ep.company_id
  order by count(*) desc, ep.company_id
  limit 1
)
select
  (select company_id from chosen_primary_tenant) as primary_company_id,
  st.company_id as secondary_company_id,
  st.outsider_user_id
from secondary_tenant st;