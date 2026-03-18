-- LIMPEZA FINAL: Remover tasks de teste
DELETE FROM public.work_items
WHERE title LIKE 'Teste Final %' OR title = 'Teste logging A - task completa';