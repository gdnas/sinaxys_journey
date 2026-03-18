
SELECT 
  pg_get_functiondef(oid) as function_definition
FROM pg_proc
WHERE proname IN (
  'ensure_work_item_parent_validity',
  'ensure_work_item_tenant_coherence',
  'set_work_item_completed_at'
);
