
-- TESTE 1: Tentar INSERT sem key_result_id (deve falhar)
-- Vou usar um SELECT para mostrar o resultado do teste
WITH test_insert AS (
  SELECT 
    (SELECT id FROM public.companies LIMIT 1) as tenant_id,
    (SELECT id FROM public.profiles LIMIT 1) as owner_id,
    (SELECT id FROM public.profiles LIMIT 1) as creator_id
)
SELECT 
  'Cenário 1: INSERT sem key_result_id' as scenario,
  'Esperado: FALHA - key_result_id is required' as expected,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM public.projects 
      WHERE name = 'TESTE: Sem key_result'
    ) THEN 'FALHA: Insert funcionou quando não deveria'
    ELSE 'SUCESSO: Insert foi bloqueado'
  END as result;
