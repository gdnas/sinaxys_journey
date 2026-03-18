begin;
select set_config('request.jwt.claim.sub', 'd9068441-409a-44e7-96a2-40e1859c431e', true);
select set_config('request.jwt.claim.role', 'authenticated', true);
select public.can_manage_okr_scope(
  'b803164b-2b0a-47ad-9187-eabe7314491d'::uuid,
  'strategic',
  '23018402-895c-456e-a1b6-f02c4399617e'::uuid
) as can_manage_okr_scope;
rollback;