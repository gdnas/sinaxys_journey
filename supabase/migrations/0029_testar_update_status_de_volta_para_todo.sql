-- Testar UPDATE status de volta para todo
UPDATE work_items 
SET status = 'todo'
WHERE id = 'cc46a1b8-5e45-4f6d-82ba-1430aff2c087'
RETURNING id, title, status, completed_at;