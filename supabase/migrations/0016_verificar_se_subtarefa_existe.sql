-- Verificar se a subtarefa ainda existe
SELECT id, title, status, project_id, tenant_id, parent_id
FROM work_items 
WHERE id = '1cb0df29-a7e4-7a98-bc7a-dbd0c8768634';