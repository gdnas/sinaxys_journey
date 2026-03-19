-- ============================================================================
-- Migration: Criar RPC work_items_for_user_with_okr_context
-- ============================================================================
-- Data: 2025-01-15
-- Propósito: Corrigir erro PGRST202 no módulo OKR > Hoje
--
-- Problema:
--   O frontend estava chamando public.work_items_for_user_with_okr_context()
--   mas essa função não existia no banco, causando erro:
--   PGRST202 - Could not find the function
--
-- Solução:
--   Criar RPC que busca work_items com contexto de OKR enriquecido
--   (projeto, key_result, objective, cycle)
--
-- Impacto:
--   - Mínimo: apenas criação de nova RPC
--   - Sem alterações em tabelas existentes
--   - Sem alterações em RLS policies
--   - Idempotente (CREATE OR REPLACE)
--
-- Fonte:
--   work_items é a fonte única de verdade para execução
--   okr_tasks é legada e não é usada aqui
-- ============================================================================

-- ============================================================================
-- DROP da função existente (se houver) para permitir recriação
-- ============================================================================
DROP FUNCTION IF EXISTS public.work_items_for_user_with_okr_context(uuid, date, date);

-- ============================================================================
-- RPC: public.work_items_for_user_with_okr_context
-- ============================================================================
-- Propósito: Retornar work_items de um usuário com contexto de OKR
-- Usado por: Módulo OKR > Hoje (frontend React)
--
-- Parâmetros:
--   p_user_id uuid - ID do usuário cujas tarefas devem ser retornadas
--   p_from date DEFAULT NULL - Data de início da janela (opcional)
--   p_to date DEFAULT NULL - Data final da janela (opcional)
--
-- Filtros:
--   - assignee_user_id = p_user_id
--   - due_date entre p_from e p_to (quando fornecidos)
--   - work_items sem due_date são incluídos (tarefas sem prazo)
--
-- Joins (todos LEFT JOIN - toleram ausência de vínculos):
--   - projects → project_name
--   - okr_key_results → key_result_title, objective_id
--   - okr_objectives → objective_title, cycle_id
--   - okr_cycles → cycle_label
--
-- Ordenação:
--   - due_date ASC NULLS LAST (tarefas mais urgentes primeiro)
--   - created_at DESC (tarefas mais recentes depois)
--
-- Campos de retorno:
--   - Todos os campos de work_items
--   - project_name (contexto de projeto)
--   - key_result_title (contexto de KR)
--   - objective_title (contexto de objetivo)
--   - cycle_label (ex: "Q1/2026" ou "2026")
--
-- Segurança:
--   - SECURITY DEFINER para bypass RLS (controlado por assignee_user_id)
--   - Parâmetro p_user_id controla acesso (não usa auth.uid())
--   - Somente retorna itens do usuário especificado
-- ============================================================================

CREATE OR REPLACE FUNCTION public.work_items_for_user_with_okr_context(
  p_user_id uuid,
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL
)
RETURNS TABLE (
  -- Campos de work_items
  id uuid,
  tenant_id uuid,
  project_id uuid,
  title text,
  description text,
  type text,
  status text,
  priority text,
  assignee_user_id uuid,
  parent_id uuid,
  start_date timestamp with time zone,
  due_date timestamp with time zone,
  completed_at timestamp with time zone,
  created_by_user_id uuid,
  created_at timestamp with time zone,
  updated_at timestamp with time zone,
  key_result_id uuid,
  deliverable_id uuid,
  estimate_minutes integer,
  checklist jsonb,
  -- Campos de contexto OKR
  project_name text,
  key_result_title text,
  objective_title text,
  cycle_label text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Campos de work_items
    wi.id,
    wi.tenant_id,
    wi.project_id,
    wi.title,
    wi.description,
    wi.type,
    wi.status,
    wi.priority,
    wi.assignee_user_id,
    wi.parent_id,
    wi.start_date,
    wi.due_date,
    wi.completed_at,
    wi.created_by_user_id,
    wi.created_at,
    wi.updated_at,
    wi.key_result_id,
    wi.deliverable_id,
    wi.estimate_minutes,
    wi.checklist,
    -- Contexto de projeto
    p.name AS project_name,
    -- Contexto de Key Result
    kr.title AS key_result_title,
    -- Contexto de Objetivo
    oo.title AS objective_title,
    -- Label do ciclo (ex: "Q1/2026" ou "2026")
    CASE
      WHEN oc.type = 'QUARTERLY' THEN 'Q' || oc.quarter || '/' || oc.year
      ELSE oc.year::text
    END AS cycle_label
  FROM public.work_items wi
  -- Join com projects (opcional, para project_name)
  LEFT JOIN public.projects p
    ON p.id = wi.project_id
  -- Join com okr_key_results (opcional, para key_result_title e objective_id)
  LEFT JOIN public.okr_key_results kr
    ON kr.id = wi.key_result_id
  -- Join com okr_objectives (opcional, para objective_title e cycle_id)
  LEFT JOIN public.okr_objectives oo
    ON oo.id = kr.objective_id
  -- Join com okr_cycles (opcional, para cycle_label)
  LEFT JOIN public.okr_cycles oc
    ON oc.id = oo.cycle_id
  WHERE wi.assignee_user_id = p_user_id
    -- Filtro por janela de datas (convertendo timestamp para date)
    AND (
      p_from IS NULL
      OR wi.due_date IS NULL
      OR (wi.due_date)::date >= p_from
    )
    AND (
      p_to IS NULL
      OR wi.due_date IS NULL
      OR (wi.due_date)::date <= p_to
    )
  ORDER BY
    wi.due_date ASC NULLS LAST,
    wi.created_at DESC;
END;
$$;

-- ============================================================================
-- Verificação da criação da função
-- ============================================================================
DO $$
DECLARE
  function_exists boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'work_items_for_user_with_okr_context'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) INTO function_exists;

  IF function_exists THEN
    RAISE NOTICE 'RPC work_items_for_user_with_okr_context criada com sucesso!';
  ELSE
    RAISE NOTICE 'ERRO: RPC work_items_for_user_with_okr_context não foi criada!';
  END IF;
END $$;

-- ============================================================================
-- Exemplo de uso (comentado - apenas para documentação)
-- ============================================================================
-- SELECT * FROM public.work_items_for_user_with_okr_context(
--   p_user_id := 'user-uuid'::uuid,
--   p_from := '2026-01-01'::date,
--   p_to := '2026-01-31'::date
-- );
