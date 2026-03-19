
-- CENÁRIO 1: INSERT sem key_result_id => DEVE FALHAR
-- Tenta inserir e captura erro
DO $$
BEGIN
  -- Tentar INSERT sem key_result_id
  INSERT INTO public.projects (
    tenant_id,
    name,
    owner_user_id,
    created_by_user_id,
    visibility,
    status,
    key_result_id
  ) VALUES (
    (SELECT id FROM public.companies LIMIT 1),
    'Cenário 1: Projeto sem key_result',
    (SELECT id FROM public.profiles LIMIT 1),
    (SELECT id FROM public.profiles LIMIT 1),
    'public',
    'not_started',
    NULL
  );
  
  RAISE NOTICE 'ERRO: O INSERT não deveria ter funcionado';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'SUCESSO: Erro esperado - %', SQLERRM;
END $$;
