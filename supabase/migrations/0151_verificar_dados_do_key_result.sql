-- Verificar se o key_result associado existe
SELECT kr.id, kr.title, kr.objective_id, o.company_id, o.owner_user_id
FROM public.okr_key_results kr
JOIN public.okr_objectives o ON o.id = kr.objective_id
WHERE kr.id = '7713b9a1-5f85-4e8e-8354-42571b553729';