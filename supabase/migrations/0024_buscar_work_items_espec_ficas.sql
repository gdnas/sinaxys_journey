-- Buscar todas as work_items para ver o que aconteceu
SELECT id, title, status, project_id, tenant_id, parent_id, created_at
FROM work_items 
WHERE id IN ('1cb0df29-a7e4-7a98-bc7a-dbd0c8768634', 'cc46a1b8-5e45-4f6d-82ba-1430aff2c087', '3054db0a-e5ae-464e-95eb-784eaa6d53db')
ORDER BY created_at DESC;