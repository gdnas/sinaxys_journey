-- Verificar se o evento de exclusão foi registrado na timeline
SELECT 
  id,
  event_type,
  old_value,
  metadata,
  created_at
FROM work_item_events
WHERE work_item_id = '748ffad4-ef17-442a-969b-285458bbc799'
  AND event_type = 'comment_deleted'
ORDER BY created_at DESC
LIMIT 3;