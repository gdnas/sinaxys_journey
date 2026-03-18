-- Ver função de parent validity
SELECT 
  pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'ensure_work_item_parent_validity';