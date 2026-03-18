
-- Verificar se o usuário que criou a subtarefa é membro do projeto
SELECT 
  pm.user_id,
  pm.project_id,
  p.owner_user_id
FROM project_members pm
JOIN projects p ON p.id = pm.project_id
WHERE pm.project_id = '78d61014-4869-45f4-a777-87cc2d1ef9b7';
