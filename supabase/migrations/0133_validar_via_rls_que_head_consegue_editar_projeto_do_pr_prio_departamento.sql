begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', 'ffdf5772-7445-420e-9c99-13f291964d08', true);
update public.projects
set description = '__TEST_SPRINT__ HEAD editou projeto do próprio departamento'
where id = '80c874f5-02a6-4c94-924f-4a23650f2509'
returning id, description;
rollback;