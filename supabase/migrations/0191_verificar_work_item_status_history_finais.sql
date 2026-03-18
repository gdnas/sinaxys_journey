-- VERIFICAÇÃO FINAL: work_item_status_history
SELECT 
  work_item_id,
  old_status,
  new_status,
  changed_by_user_id,
  created_at
FROM public.work_item_status_history
WHERE work_item_id IN (
  SELECT id FROM public.work_items 
  WHERE title LIKE 'Teste Final %'
)
ORDER BY work_item_id, created_at;