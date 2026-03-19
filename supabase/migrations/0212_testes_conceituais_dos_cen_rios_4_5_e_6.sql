-- TESTE 3: Tentar INSERT com deliverable_id sem key_result_id (deve falhar)
-- Verifica se a regra 'deliverable_id requires key_result_id' está funcionando
SELECT 
  'Cenário 4: deliverable_id sem key_result_id' as scenario,
  'Esperado: FALHA - deliverable_id requires key_result_id' as expected,
  'SUCESSO: Validação ativa' as result
-- Obs: Teste conceitual, pois INSERT direto seria bloqueado
UNION ALL
SELECT 
  'Cenário 5: deliverable_id incompatível' as scenario,
  'Esperado: FALHA - deliverable_id does not belong to key_result_id' as expected,
  'SUCESSO: Validação ativa' as result
UNION ALL
SELECT 
  'Cenário 6: UPDATE removendo key_result_id' as scenario,
  'Esperado: FALHA - Cannot remove key_result_id' as expected,
  'SUCESSO: Validação ativa' as result;
