-- Testar se a policy consegue acessar work_items corretamente
BEGIN;

-- Simular o que a policy faz
SELECT 
  wi.id,
  wi.tenant_id,
  p.company_id as user_company_id,
  wi.tenant_id = p.company_id as tenant_matches
FROM public.work_items wi
JOIN public.profiles p ON p.id = 'd9068441-409a-44e7-96a2-40e1859c431e'
WHERE wi.title = 'Teste de tarefa OKR'
LIMIT 1;

ROLLBACK;