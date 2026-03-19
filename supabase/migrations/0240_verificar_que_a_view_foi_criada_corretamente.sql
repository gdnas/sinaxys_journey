
-- Verificar que a VIEW existe e está acessível
SELECT 
  schemaname,
  viewname,
  viewowner
FROM pg_views
WHERE viewname = 'v_project_execution_summary';
