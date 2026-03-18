-- VERIFICAÇÃO 2 CORRIGIDA: work_item_status_history
SELECT 
  id,
  work_item_id,
  old_status,
  new_status,
  changed_by_user_id,
  created_at
FROM public.work_item_status_history
WHERE work_item_id = '34a473cc-7717-4f68-877a-e27ef30ce412'
ORDER BY created_at;