-- Criar subtarefa com payload completo
INSERT INTO work_items (
  tenant_id,
  project_id,
  parent_id,
  title,
  description,
  type,
  status,
  priority,
  assignee_user_id,
  created_by_user_id,
  start_date,
  due_date
) VALUES (
  '15de0336-fa2e-4a8d-b4d6-d783ca295b65',  -- tenant_id da tarefa pai
  '78d61014-4869-45f4-a777-87cc2d1ef9b7',  -- project_id da tarefa pai
  '748ffad4-ef17-442a-969b-285458bbc799',  -- parent_id (tarefa pai)
  'Subtarefa de teste',                     -- title
  NULL,                                     -- description
  'task',                                   -- type
  'todo',                                   -- status
  'medium',                                 -- priority
  NULL,                                     -- assignee_user_id
  (SELECT id FROM auth.users LIMIT 1),      -- created_by_user_id
  NULL,                                     -- start_date
  NULL                                      -- due_date
) RETURNING id, title, project_id, tenant_id, parent_id, status;