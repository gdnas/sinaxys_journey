-- Testar query do useWorkItems (deve trazer apenas tarefas principais)
SELECT id, title, parent_id, status
FROM work_items 
WHERE project_id = '78d61014-4869-45f4-a777-87cc2d1ef9b7'
  AND parent_id IS NULL
ORDER BY created_at DESC;