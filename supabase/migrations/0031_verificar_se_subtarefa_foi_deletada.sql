-- Verificar se a subtarefa foi deletada
SELECT id, title, status, project_id, tenant_id, parent_id
FROM work_items 
WHERE id = 'cc46a1b8-5e45-4f6d-82ba-1430aff2c087';