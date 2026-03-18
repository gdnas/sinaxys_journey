select pg_get_functiondef('public.can_view_work_item_row(uuid,uuid,uuid,uuid,uuid,uuid)'::regprocedure) as can_view_work_item_row,
       pg_get_functiondef('public.can_manage_work_item_row(uuid,uuid,uuid,uuid,uuid,uuid)'::regprocedure) as can_manage_work_item_row,
       pg_get_functiondef('public.ensure_work_item_tenant_coherence()'::regprocedure) as ensure_work_item_tenant_coherence,
       pg_get_functiondef('public.can_create_work_item(uuid,uuid,uuid,uuid,uuid,uuid)'::regprocedure) as can_create_work_item;