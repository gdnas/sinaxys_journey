-- Buscar subtarefas da tarefa pai
SELECT id, title, project_id, tenant_id, parent_id, status, created_at
FROM work_items 
WHERE parent_id = '748ffad4-ef17-442a-969b-285458bbc799'
ORDER BY created_at DESC;