-- Testar exclusão de comentário (deve registrar evento na timeline)
DELETE FROM work_item_comments
WHERE id = '488ec10f-85c8-4813-b877-6321fc426951'
RETURNING id, content;