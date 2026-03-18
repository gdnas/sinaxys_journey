select p.proname as function_name,
       p.oid::regprocedure::text as function_signature,
       pg_get_functiondef(p.oid) as source
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'can_create_work_item',
    'can_manage_okr_scope',
    'can_view_okr_scope',
    'can_manage_project',
    'can_view_work_item',
    'can_manage_work_item'
  )
order by p.proname, p.oid::regprocedure::text;