
-- 8. Listar projetos sem contexto estratégico (para reportar legado inválido)
SELECT 
    p.id,
    p.name,
    p.created_at,
    p.status
FROM public.projects p
WHERE p.key_result_id IS NULL 
  AND p.deliverable_id IS NULL
ORDER BY p.created_at;
