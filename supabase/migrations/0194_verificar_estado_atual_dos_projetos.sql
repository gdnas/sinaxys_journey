
-- 2. Verificar dados atuais e inconsistências
SELECT 
    COUNT(*) as total_projetos,
    COUNT(key_result_id) as com_key_result,
    COUNT(deliverable_id) as com_deliverable,
    COUNT(*) - COUNT(key_result_id) - COUNT(deliverable_id) as sem_contexto_estrategico
FROM public.projects;
