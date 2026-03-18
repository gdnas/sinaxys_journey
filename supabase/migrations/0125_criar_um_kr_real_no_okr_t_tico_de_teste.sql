begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'ffdf5772-7445-420e-9c99-13f291964d08', true);
insert into public.okr_key_results (objective_id, title, description, kind, start_value, target_value, current_value, owner_user_id, due_at)
values ('ac8812ca-0b8e-430e-bc8c-307247a0f4e7', '__TEST_SPRINT__ KR principal', 'KR real de teste', 'METRIC', 0, 100, 10, 'ffdf5772-7445-420e-9c99-13f291964d08', current_date + 15)
returning id;
commit;