-- Buscar uma subtarefa existente para teste
SELECT id, title, status, project_id, tenant_id, parent_id
FROM work_items 
WHERE parent_id IS NOT NULL
LIMIT 1;