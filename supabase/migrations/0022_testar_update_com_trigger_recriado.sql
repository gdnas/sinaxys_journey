-- Testar UPDATE status para done com trigger recriado
UPDATE work_items 
SET status = 'done'
WHERE id = '1cb0df29-a7e4-7a98-bc7a-dbd0c8768634'
RETURNING id, title, status, completed_at;