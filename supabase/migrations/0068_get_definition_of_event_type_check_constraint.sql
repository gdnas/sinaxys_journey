-- Show check constraint definition for work_item_events_event_type_check
SELECT conname, pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname = 'work_item_events_event_type_check';