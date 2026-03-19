
-- DIAGNÓSTICO: Projetos sem key_result_id (inválidos segundo regra nova)
SELECT 
    id,
    name,
    key_result_id,
    deliverable_id,
    status,
    created_at
FROM public.projects
WHERE key_result_id IS NULL
ORDER BY created_at;
