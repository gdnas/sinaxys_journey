-- VERIFICAÇÃO FINAL: work_item_events
SELECT 
  work_item_id,
  user_id,
  event_type,
  old_value,
  new_value,
  created_at
FROM public.work_item_events
WHERE work_item_id IN (
  SELECT id FROM public.work_items 
  WHERE title LIKE 'Teste Final %'
)
ORDER BY work_item_id, created_at;