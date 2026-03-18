-- Verificar tarefas existentes para teste
SELECT 
  id,
  title,
  status,
  project_id,
  tenant_id,
  created_by_user_id
FROM work_items
ORDER BY created_at DESC
LIMIT 5;