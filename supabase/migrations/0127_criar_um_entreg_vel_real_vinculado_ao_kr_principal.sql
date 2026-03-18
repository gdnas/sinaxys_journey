begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'ffdf5772-7445-420e-9c99-13f291964d08', true);
insert into public.okr_deliverables (key_result_id, tier, title, description, owner_user_id, status, due_at)
values ('4fa11cd1-7f2a-424c-91f8-f03b60e966cd', 'TIER2', '__TEST_SPRINT__ Entregável', 'Entregável real de teste', 'ffdf5772-7445-420e-9c99-13f291964d08', 'TODO', current_date + 10)
returning id, department_id;
commit;