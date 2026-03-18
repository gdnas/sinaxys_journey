-- Verificar eventos da timeline
SELECT id, event_type, old_value, new_value, metadata, created_at
FROM work_item_events 
WHERE work_item_id = 'cc46a1b8-5e45-4f6d-82ba-1430aff2c087'
ORDER BY created_at DESC;