-- Verificar se o evento de criação foi registrado
SELECT 
  id,
  event_type,
  new_value,
  created_at,
  user_id
FROM work_item_events
WHERE work_item_id = '748ffad4-ef17-442a-969b-285458bbc799'
  AND event_type = 'comment_added'
ORDER BY created_at DESC
LIMIT 1;