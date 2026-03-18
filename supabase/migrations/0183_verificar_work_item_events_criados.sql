-- VERIFICAÇÃO 1: work_item_events
SELECT 
  id,
  work_item_id,
  user_id,
  event_type,
  old_value,
  new_value,
  created_at
FROM public.work_item_events
WHERE work_item_id = '34a473cc-7717-4f68-877a-e27ef30ce412'
ORDER BY created_at;