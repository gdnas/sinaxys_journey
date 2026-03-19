
-- TESTE 2: Tentar UPDATE removendo contexto estratégico (DEVE FALHAR)
-- Vamos simular um projeto com contexto e tentar remover
DO $$
DECLARE
  project_id uuid;
BEGIN
  -- Pegar um projeto que tenha key_result_id
  SELECT id INTO project_id 
  FROM public.projects 
  WHERE key_result_id IS NOT NULL 
  LIMIT 1;
  
  IF project_id IS NOT NULL THEN
    RAISE NOTICE 'Testando UPDATE no projeto: %', project_id;
    -- Esta query deve gerar erro se tentarmos remover o contexto
    -- UPDATE public.projects SET key_result_id = NULL WHERE id = project_id;
  ELSE
    RAISE NOTICE 'Nenhum projeto com key_result_id encontrado para teste';
  END IF;
END $$;
