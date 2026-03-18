-- Verificar comentários existentes
SELECT 
  id,
  work_item_id,
  user_id,
  LEFT(content, 50) as content_preview,
  created_at,
  updated_at
FROM work_item_comments
ORDER BY created_at DESC
LIMIT 5;