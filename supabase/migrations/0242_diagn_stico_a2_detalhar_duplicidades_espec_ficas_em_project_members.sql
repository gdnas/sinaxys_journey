
-- ============================================
-- DIAGNÓSTICO A2: Detalhar duplicidades em project_members
-- ============================================
-- Listar todas as duplicidades encontradas
SELECT 
  project_id,
  user_id,
  role_in_project,
  COUNT(*) as ocorrencias
FROM project_members
GROUP BY project_id, user_id, role_in_project
HAVING COUNT(*) > 1
ORDER BY project_id, user_id;
