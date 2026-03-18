-- Buscar usuário do mesmo tenant que não seja owner do deliverable
SELECT p.id, p.email, p.role, p.company_id
FROM public.profiles p
WHERE p.company_id = 'b803164b-2b0a-47ad-9187-eabe7314491d'
  AND p.id != 'd9068441-409a-44e7-96a2-40e1859c431e'
LIMIT 1;