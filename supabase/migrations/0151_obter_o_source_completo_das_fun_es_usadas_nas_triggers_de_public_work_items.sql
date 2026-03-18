select p.proname as function_name,
       p.oid::regprocedure::text as function_signature,
       pg_get_functiondef(p.oid) as source
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.proname in (
    'ensure_work_item_tenant_coherence',
    'ensure_work_item_parent_validity',
    'log_work_item_event',
    'set_work_item_completed_at',
    'set_work_items_updated_at',
    'work_item_status_change_to_history'
  )
order by p.proname;