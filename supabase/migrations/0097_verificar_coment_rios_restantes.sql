-- Verificar comentários restantes na tarefa
SELECT 
  id,
  user_id,
  LEFT(content, 50) as content_preview,
  created_at,
  updated_at
FROM work_item_comments
WHERE work_item_id = '748ffad4-ef17-442a-969b-285458bbc799'
ORDER BY created_at DESC;