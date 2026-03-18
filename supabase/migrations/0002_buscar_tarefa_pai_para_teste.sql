-- Buscar uma tarefa existente para teste
SELECT id, title, project_id, tenant_id, parent_id 
FROM work_items 
WHERE parent_id IS NULL 
LIMIT 1;