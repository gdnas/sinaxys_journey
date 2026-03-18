-- Buscar key_result existente
SELECT kr.id, kr.title, o.company_id
FROM public.okr_key_results kr
JOIN public.okr_objectives o ON o.id = kr.objective_id
LIMIT 1;