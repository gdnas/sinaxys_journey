-- Buscar usuário que pertence ao tenant do deliverable
SELECT p.id, p.email, p.company_id, p.role
FROM public.profiles p
WHERE p.company_id = 'b803164b-2b0a-47ad-9187-eabe7314491d'
LIMIT 1;