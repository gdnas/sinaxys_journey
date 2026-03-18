-- Resumo dos testes realizados
-- 1. Verificar todos os eventos da timeline da tarefa de teste
SELECT 
  event_type,
  COUNT(*) as count
FROM work_item_events
WHERE work_item_id = '748ffad4-ef17-442a-969b-285458bbc799'
GROUP BY event_type
ORDER BY event_type;