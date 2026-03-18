-- Verificar se a função log_work_item_event tem problema de acesso a work_items
-- devido ao SECURITY DEFINER e RLS
BEGIN;

-- Tentar simular o que o trigger faz
-- O trigger é SECURITY DEFINER com search_path vazio
-- Ele precisa acessar a tabela work_items para verificar o parent_id

-- Criar uma função de teste que simula o trigger
CREATE OR REPLACE FUNCTION test_log_work_item_event_access()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $$
DECLARE
  v_work_item record;
BEGIN
  -- Tentar acessar work_items
  SELECT * INTO v_work_item 
  FROM public.work_items 
  WHERE title = 'Teste de trigger log_work_item_event'
  LIMIT 1;
  
  RETURN v_work_item.id IS NOT NULL;
END;
$$;

-- Executar a função
SELECT test_log_work_item_event_access();

-- Limpar
DROP FUNCTION test_log_work_item_event_access();

ROLLBACK;