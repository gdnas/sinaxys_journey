begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '67acbc23-10a2-4424-b033-36e6985f7ad1', true);
insert into public.okr_objectives (company_id, cycle_id, level, okr_level, owner_user_id, title)
values ('15de0336-fa2e-4a8d-b4d6-d783ca295b65', 'ee165364-4b17-48c8-be27-337af9ca84b2', 'COMPANY', 'strategic', '67acbc23-10a2-4424-b033-36e6985f7ad1', '__TEST_SPRINT__ OKR estratégico admin')
returning id;
rollback;