
-- 3. Verificar projetos com ambos os campos (inconsistência potencial)
SELECT 
    p.id,
    p.name,
    p.key_result_id,
    p.deliverable_id
FROM public.projects p
WHERE p.key_result_id IS NOT NULL 
  AND p.deliverable_id IS NOT NULL;
