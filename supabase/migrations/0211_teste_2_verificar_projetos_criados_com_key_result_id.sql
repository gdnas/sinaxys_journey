
-- TESTE 2: Verificar se existe projeto criado com key_result_id válido
SELECT 
  'Cenário 2: INSERT com key_result_id válido' as scenario,
  'Esperado: SUCESSO' as expected,
  COUNT(*) FILTER (WHERE name LIKE 'Cenário 2:%') as count,
  CASE 
    WHEN COUNT(*) FILTER (WHERE name LIKE 'Cenário 2:%') > 0 THEN 'SUCESSO: Projetos criados com key_result'
    ELSE 'INFO: Nenhum projeto de teste encontrado'
  END as result
FROM public.projects;
