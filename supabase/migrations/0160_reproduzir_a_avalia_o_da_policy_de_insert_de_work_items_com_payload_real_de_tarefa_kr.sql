begin;
select set_config('request.jwt.claim.sub', 'd9068441-409a-44e7-96a2-40e1859c431e', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select public.can_create_work_item(
  'b803164b-2b0a-47ad-9187-eabe7314491d'::uuid,
  null,
  '138f80e1-bbb6-493d-8939-90a92ec44fb8'::uuid,
  'adbf124b-d699-4cfa-8853-c7829f604a06'::uuid,
  'd9068441-409a-44e7-96a2-40e1859c431e'::uuid,
  'd9068441-409a-44e7-96a2-40e1859c431e'::uuid
) as can_insert;
rollback;