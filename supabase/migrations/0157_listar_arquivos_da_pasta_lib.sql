-- Listar todos os arquivos na pasta src/lib
SELECT * 
FROM (SELECT 'projectsDb.ts' as filename, 'src/lib/projectsDb.ts' as filepath) t
WHERE 1=0;