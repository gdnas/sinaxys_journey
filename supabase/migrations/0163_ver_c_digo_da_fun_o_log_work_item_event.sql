-- Ver a função log_work_item_event
SELECT 
  pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'log_work_item_event';