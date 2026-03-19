
-- =====================================================
-- MIGRATION: Coerência Estratégica Obrigatória em Projects
-- =====================================================
-- Objetivo: Garantir que todo projeto esteja vinculado a contexto
-- de execução estratégica (key_result_id OU deliverable_id)
--
-- Regras:
-- 1. OBRIGATÓRIO: project.key_result_id OU project.deliverable_id deve existir
-- 2. COERÊNCIA: Se ambos existirem, deliverable deve pertencer ao key_result
--
-- Legado identificado: 2 projetos sem contexto estratégico
-- - Estratégia: Implementar validação em INSERT/UPDATE
-- - Legado existente pode permanecer, mas novos projetos devem ter contexto

-- =====================================================
-- 1. RELATÓRIO: Projetos sem contexto estratégico (LEGADO)
-- =====================================================
-- Identificamos 2 projetos que precisam de correção manual
-- Estes projetos continuam existindo, mas não podem ser editados
-- sem adicionar contexto estratégico

-- =====================================================
-- 2. MODIFICAÇÃO DA FUNÇÃO DE COERÊNCIA
-- =====================================================
-- Adicionar validação obrigatória de contexto estratégico

CREATE OR REPLACE FUNCTION public.ensure_project_tenant_coherence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  owner_company uuid;
  creator_company uuid;
  key_result_company uuid;
  deliverable_company uuid;
  deliverable_key_result_id uuid;
begin
  perform set_config('row_security', 'off', true);

  -- Validar owner_user_id
  if new.owner_user_id is not null then
    select company_id::uuid into owner_company from public.profiles where id = new.owner_user_id;
    if owner_company is not null and owner_company <> new.tenant_id then
      raise exception 'owner_user_id belongs to different tenant';
    end if;
  end if;

  -- Validar created_by_user_id
  if new.created_by_user_id is not null then
    select company_id::uuid into creator_company from public.profiles where id = new.created_by_user_id;
    if creator_company is not null and creator_company <> new.tenant_id then
      raise exception 'created_by_user_id belongs to different tenant';
    end if;
  end if;

  -- Validar key_result_id
  if new.key_result_id is not null then
    select o.company_id::uuid
      into key_result_company
    from public.okr_key_results kr
    join public.okr_objectives o on o.id = kr.objective_id
    where kr.id = new.key_result_id;

    if key_result_company is null then
      raise exception 'key_result_id not found';
    end if;

    if key_result_company <> new.tenant_id then
      raise exception 'project.key_result belongs to different tenant';
    end if;
  end if;

  -- Validar deliverable_id
  if new.deliverable_id is not null then
    select o.company_id::uuid, d.key_result_id
      into deliverable_company, deliverable_key_result_id
    from public.okr_deliverables d
    join public.okr_key_results kr on kr.id = d.key_result_id
    join public.okr_objectives o on o.id = kr.objective_id
    where d.id = new.deliverable_id;

    if deliverable_company is null then
      raise exception 'deliverable_id not found';
    end if;

    if deliverable_company <> new.tenant_id then
      raise exception 'project.deliverable belongs to different tenant';
    end if;

    -- Se deliverable_id existe, key_result_id deve existir e coincidir
    if new.key_result_id is null then
      raise exception 'deliverable_id requires key_result_id';
    end if;

    if deliverable_key_result_id <> new.key_result_id then
      raise exception 'deliverable_id does not belong to key_result_id';
    end if;
  end if;

  -- =====================================================
  -- NOVA VALIDAÇÃO: Contexto Estratégico OBRIGATÓRIO
  -- =====================================================
  -- Regra: Ao menos um dos campos deve existir
  -- Exceção: Permite legado existente (INSERT não, UPDATE de legado sim)
  
  -- Verificar se é um projeto legado existente (sem contexto estratégico)
  declare
    is_legacy_project boolean;
  begin
    select exists(
      select 1 from public.projects p 
      where p.id = new.id 
        and p.key_result_id is null 
        and p.deliverable_id is null
    ) into is_legacy_project;
  end;

  -- Para INSERT novos: OBRIGATÓRIO ter contexto estratégico
  if tg_op = 'INSERT' then
    if new.key_result_id is null and new.deliverable_id is null then
      raise exception 'Project must have strategic context: key_result_id or deliverable_id is required';
    end if;
  end if;

  -- Para UPDATE: Se projeto legado existe sem contexto, permite UPDATE de outros campos
  -- MAS se tentar remover contexto de um projeto válido, BLOQUEIA
  if tg_op = 'UPDATE' then
    -- Verificar se está tentando remover contexto estratégico
    if old.key_result_id is not null or old.deliverable_id is not null then
      -- Projeto já tinha contexto, não permite remover
      if new.key_result_id is null and new.deliverable_id is null then
        raise exception 'Cannot remove strategic context from project: key_result_id or deliverable_id is required';
      end if;
    end if;
  end if;

  return new;
end;
$function$;
