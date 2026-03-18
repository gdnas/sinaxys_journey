-- Testar UPDATE status para done com função corrigida
UPDATE work_items 
SET status = 'done'
WHERE id = 'cc46a1b8-5e45-4f6d-82ba-1430aff2c087'
RETURNING id, title, status, completed_at;