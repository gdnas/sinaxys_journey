
SELECT 
    tc.table_name,
    tc.constraint_name,
    tc.constraint_type
FROM information_schema.table_constraints AS tc
WHERE tc.table_name IN ('work_item_comments', 'work_item_events')
ORDER BY tc.table_name, tc.constraint_name;
