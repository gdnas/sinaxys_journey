begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'ffdf5772-7445-420e-9c99-13f291964d08', true);
insert into public.projects (tenant_id, name, description, owner_user_id, created_by_user_id, visibility, status, department_id, department_ids, key_result_id, deliverable_id)
values ('15de0336-fa2e-4a8d-b4d6-d783ca295b65', '__TEST_SPRINT__ Projeto KR+Entregável', 'Projeto real ligado ao KR e entregável', 'ffdf5772-7445-420e-9c99-13f291964d08', 'ffdf5772-7445-420e-9c99-13f291964d08', 'private', 'on_track', '584dc1a1-5a09-4bcb-8340-525b64eb538c', array['584dc1a1-5a09-4bcb-8340-525b64eb538c']::uuid[], '4fa11cd1-7f2a-424c-91f8-f03b60e966cd', '81179021-166d-49e2-bb28-f8dcf15313aa')
returning id;
commit;