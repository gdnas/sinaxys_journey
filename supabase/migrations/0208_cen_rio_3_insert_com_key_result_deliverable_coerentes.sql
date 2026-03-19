
-- CENÁRIO 3: INSERT com key_result_id + deliverable_id coerentes => DEVE FUNCIONAR
DO $$
DECLARE
  kr_id uuid;
  deliv_id uuid;
  company_id uuid;
  profile_id uuid;
BEGIN
  SELECT id INTO company_id FROM public.companies LIMIT 1;
  SELECT id INTO profile_id FROM public.profiles WHERE company_id = company_id LIMIT 1;
  
  -- Pegar KR e seu deliverable
  SELECT kr.id INTO kr_id
  FROM public.okr_key_results kr
  JOIN public.okr_objectives o ON o.id = kr.objective_id
  WHERE o.company_id = company_id
  LIMIT 1;
  
  SELECT id INTO deliv_id
  FROM public.okr_deliverables d
  WHERE d.key_result_id = kr_id
  LIMIT 1;
  
  IF kr_id IS NOT NULL AND deliv_id IS NOT NULL THEN
    INSERT INTO public.projects (
      tenant_id,
      name,
      owner_user_id,
      created_by_user_id,
      visibility,
      status,
      key_result_id,
      deliverable_id
    ) VALUES (
      company_id,
      'Cenário 3: Projeto com key_result + deliverable',
      profile_id,
      profile_id,
      'public',
      'not_started',
      kr_id,
      deliv_id
    );
    
    RAISE NOTICE 'SUCESSO: Projeto criado com key_result=% e deliverable=%', kr_id, deliv_id;
  ELSE
    RAISE NOTICE 'AVISO: Dados insuficientes para teste (kr=%, deliv=%)', kr_id, deliv_id;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'ERRO: %', SQLERRM;
END $$;
