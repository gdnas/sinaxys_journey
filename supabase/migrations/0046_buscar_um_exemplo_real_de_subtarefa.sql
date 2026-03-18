
SELECT 
  id,
  project_id,
  tenant_id,
  parent_id,
  created_by_user_id,
  status,
  title,
  type
FROM work_items
WHERE parent_id IS NOT NULL
ORDER BY created_at DESC
LIMIT 1;
