-- Criar tarefas de teste: uma principal e uma subtarefa
INSERT INTO work_items (
  tenant_id, project_id, parent_id, title, description, type, status, priority, 
  assignee_user_id, created_by_user_id, start_date, due_date
) VALUES 
  -- Tarefa principal
  ('15de0336-fa2e-4a8d-b4d6-d783ca295b65', '78d61014-4869-45f4-a777-87cc2d1ef9b7', NULL, 'Tarefa Principal Teste', NULL, 'task', 'todo', 'medium', NULL, (SELECT id FROM auth.users LIMIT 1), NULL, NULL),
  -- Subtarefa
  ('15de0336-fa2e-4a8d-b4d6-d783ca295b65', '78d61014-4869-45f4-a777-87cc2d1ef9b7', '748ffad4-ef17-442a-969b-285458bbc799', 'Subtarefa Teste', NULL, 'task', 'todo', 'medium', NULL, (SELECT id FROM auth.users LIMIT 1), NULL, NULL)
RETURNING id, title, parent_id, status;