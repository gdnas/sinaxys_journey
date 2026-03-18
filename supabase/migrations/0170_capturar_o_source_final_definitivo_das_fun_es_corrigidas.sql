select pg_get_functiondef('public.can_view_work_item(uuid)'::regprocedure) as can_view_final,
       pg_get_functiondef('public.can_manage_work_item(uuid)'::regprocedure) as can_manage_final;