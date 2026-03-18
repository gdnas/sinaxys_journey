begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'ffdf5772-7445-420e-9c99-13f291964d08', true);
insert into public.okr_objectives (company_id, cycle_id, level, okr_level, department_id, owner_user_id, title)
values ('15de0336-fa2e-4a8d-b4d6-d783ca295b65', '1184acb1-31c0-486f-b116-e2b851a12b5c', 'DEPARTMENT', 'tactical', '584dc1a1-5a09-4bcb-8340-525b64eb538c', 'ffdf5772-7445-420e-9c99-13f291964d08', 'Teste isolado head')
returning id;
rollback;