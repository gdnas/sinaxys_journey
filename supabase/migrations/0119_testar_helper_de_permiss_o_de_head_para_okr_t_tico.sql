begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'ffdf5772-7445-420e-9c99-13f291964d08', true);
select public.can_manage_okr_scope('15de0336-fa2e-4a8d-b4d6-d783ca295b65', 'tactical', '584dc1a1-5a09-4bcb-8340-525b64eb538c'::uuid) as allowed;
rollback;