SELECT table_name, column_name 
FROM information_schema.columns 
WHERE table_name IN ('tasks', 'okr_tasks') 
AND column_name IN ('deliverable_id', 'key_result_id', 'project_id') 
ORDER BY table_name, column_name;