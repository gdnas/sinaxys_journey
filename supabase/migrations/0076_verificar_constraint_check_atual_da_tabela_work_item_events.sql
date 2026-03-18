-- Adicionar novos tipos de eventos à constraint CHECK
-- Primeiro, verificar a constraint atual
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'work_item_events'::regclass
AND contype = 'c';