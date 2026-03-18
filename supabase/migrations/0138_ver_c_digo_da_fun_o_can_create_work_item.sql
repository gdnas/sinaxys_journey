-- Ver função de policy INSERT
SELECT 
  pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'can_create_work_item';