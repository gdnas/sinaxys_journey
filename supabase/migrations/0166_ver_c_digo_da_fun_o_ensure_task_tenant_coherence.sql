-- Ver a função ensure_task_tenant_coherence
SELECT 
  pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'ensure_task_tenant_coherence';