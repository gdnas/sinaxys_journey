begin;
set local role authenticated;
set local request.jwt.claim.sub = 'd9068441-409a-44e7-96a2-40e1859c431e';
set local request.jwt.claim.role = 'authenticated';
select pg_get_functiondef('public.can_view_work_item(uuid)'::regprocedure) as can_view_source,
       pg_get_functiondef('public.can_manage_work_item(uuid)'::regprocedure) as can_manage_source;
rollback;