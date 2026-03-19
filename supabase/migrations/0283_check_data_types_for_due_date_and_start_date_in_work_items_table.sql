
SELECT 
  column_name,
  data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'work_items'
  AND column_name IN ('due_date', 'start_date')
ORDER BY column_name;
