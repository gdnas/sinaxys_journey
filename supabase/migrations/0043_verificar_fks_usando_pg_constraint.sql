
SELECT conname, contype, conrelid::regclass AS table_name, confrelid::regclass AS foreign_table_name
FROM pg_constraint
WHERE conname IN ('work_item_comments_user_id_fkey', 'work_item_events_user_id_fkey')
ORDER BY table_name;
