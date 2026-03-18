-- Remover a constraint antiga
ALTER TABLE work_item_events DROP CONSTRAINT IF EXISTS work_item_events_event_type_check;

-- Criar nova constraint com os novos tipos de eventos
ALTER TABLE work_item_events 
ADD CONSTRAINT work_item_events_event_type_check 
CHECK (event_type IN (
  'created',
  'status_changed',
  'subtask_created',
  'subtask_completed',
  'comment_added',
  'comment_edited',
  'comment_deleted',
  'assigned',
  'priority_changed',
  'deleted',
  'subtask_deleted'
));

-- Verificar a nova constraint
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'work_item_events'::regclass
AND contype = 'c';