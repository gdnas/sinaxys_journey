-- Buscar deliverable existente
SELECT d.id, d.title, d.key_result_id, o.company_id
FROM public.okr_deliverables d
JOIN public.okr_key_results kr ON kr.id = d.key_result_id
JOIN public.okr_objectives o ON o.id = kr.objective_id
LIMIT 1;