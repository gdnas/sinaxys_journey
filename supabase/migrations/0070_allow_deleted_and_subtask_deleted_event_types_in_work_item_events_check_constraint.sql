-- 1) Drop existing check constraint that blocks 'deleted' / 'subtask_deleted'
ALTER TABLE work_item_events DROP CONSTRAINT IF EXISTS work_item_events_event_type_check;

-- 2) Create new check constraint that includes 'deleted' and 'subtask_deleted'
ALTER TABLE work_item_events
ADD CONSTRAINT work_item_events_event_type_check CHECK (
  event_type = ANY (ARRAY[
    'created'::text,
    'status_changed'::text,
    'subtask_created'::text,
    'subtask_completed'::text,
    'comment_added'::text,
    'assigned'::text,
    'priority_changed'::text,
    'deleted'::text,
    'subtask_deleted'::text
  ])
);

-- 3) Confirm constraint definition
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname = 'work_item_events_event_type_check';
