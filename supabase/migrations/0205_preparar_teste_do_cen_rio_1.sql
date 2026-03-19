
-- CENÁRIO 1: INSERT sem key_result_id (DEVE FALHAR)
-- Cria uma tabela temporária para capturar o erro
DROP TABLE IF EXISTS test_scenario_1;
CREATE TEMP TABLE test_scenario_1 (error_message text);
