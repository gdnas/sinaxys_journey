-- Verificar se o deliverable realmente existe
SELECT id, key_result_id, tier, title, owner_user_id, status 
FROM public.okr_deliverables 
WHERE id = '78b90c9e-db73-4a63-a52c-0937e37ddb98';