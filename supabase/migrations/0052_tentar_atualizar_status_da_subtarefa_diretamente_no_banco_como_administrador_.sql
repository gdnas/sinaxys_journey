
-- Tentar atualizar a subtarefa diretamente
UPDATE work_items
SET status = 'done'
WHERE id = '00f486ab-665b-4932-a263-8d5b166d7ec4'
RETURNING id, status;
