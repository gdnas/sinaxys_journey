-- Buscar por migrations ou scripts relacionados ao erro
SELECT 
  filename,
  content
FROM (
  SELECT 'migration' as filename, 'test' as content
) t
WHERE 1=0;