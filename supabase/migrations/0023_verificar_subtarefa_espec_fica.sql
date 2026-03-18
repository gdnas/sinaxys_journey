-- Verificar a subtarefa específica
SELECT id, title, status, project_id, tenant_id, parent_id, created_at
FROM work_items 
WHERE id = '1cb0df29-a7e4-7a98-bc7a-dbd0c8768634';