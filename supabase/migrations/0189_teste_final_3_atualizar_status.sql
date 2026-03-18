-- TESTE FINAL 3: Atualizar status das tasks
BEGIN;

UPDATE public.work_items
SET status = 'in_progress'
WHERE title LIKE 'Teste Final %';

COMMIT;