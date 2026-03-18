begin;
set local role authenticated;
set local request.jwt.claim.sub = 'd9068441-409a-44e7-96a2-40e1859c431e';
set local request.jwt.claim.role = 'authenticated';
select public.can_create_work_item(
  'b803164b-2b0a-47ad-9187-eabe7314491d'::uuid,
  null,
  '138f80e1-bbb6-493d-8939-90a92ec44fb8'::uuid,
  'adbf124b-d699-4cfa-8853-c7829f604a06'::uuid,
  'd9068441-409a-44e7-96a2-40e1859c431e'::uuid,
  'd9068441-409a-44e7-96a2-40e1859c431e'::uuid
) as can_insert,
public.can_manage_okr_scope(
  'b803164b-2b0a-47ad-9187-eabe7314491d'::uuid,
  'strategic',
  '23018402-895c-456e-a1b6-f02c4399617e'::uuid
) as can_manage,
public.can_view_okr_scope(
  'b803164b-2b0a-47ad-9187-eabe7314491d'::uuid,
  'strategic',
  '23018402-895c-456e-a1b6-f02c4399617e'::uuid,
  'd9068441-409a-44e7-96a2-40e1859c431e'::uuid
) as can_view;
rollback;