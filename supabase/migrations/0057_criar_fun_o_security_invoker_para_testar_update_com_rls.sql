
-- Tentar fazer update simulando o usuário específico
-- Vamos usar uma função SECURITY INVOKER para testar
CREATE OR REPLACE FUNCTION test_subtask_update(p_work_item_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY INVOKER
AS $$
DECLARE
  v_result text;
BEGIN
  UPDATE work_items
  SET status = 'todo'
  WHERE id = p_work_item_id;
  
  GET DIAGNOSTICS v_result = ROW_COUNT;
  
  RETURN 'Updated ' || v_result || ' rows';
EXCEPTION WHEN OTHERS THEN
  RETURN 'Error: ' || SQLERRM;
END;
$$;
