-- Ver função de tenant coherence
SELECT 
  pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'ensure_work_item_tenant_coherence';