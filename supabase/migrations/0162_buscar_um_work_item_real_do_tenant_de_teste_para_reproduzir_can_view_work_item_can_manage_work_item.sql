with sample as (
  select id
  from public.work_items
  where tenant_id = 'b803164b-2b0a-47ad-9187-eabe7314491d'::uuid
  order by created_at desc
  limit 1
)
select * from sample;