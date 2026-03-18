-- Testar query de subtarefas (deve trazer apenas subtarefas)
SELECT id, title, parent_id, status
FROM work_items 
WHERE project_id = '78d61014-4869-45f4-a777-87cc2d1ef9b7'
  AND parent_id = '748ffad4-ef17-442a-969b-285458bbc799'
ORDER BY created_at DESC;