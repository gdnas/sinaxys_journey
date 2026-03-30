-- ============================================================================
-- Migration: Criar RPC work_items_for_user_unified
-- ============================================================================
-- Data: 2025-03-19
-- Propósito: Unificar work_items de projetos e OKRs na home page
--
-- Problema:
--   Existem work_items de projetos (com project_id) e work_items de OKRs
--   (com key_result_id e deliverable_id), mas não havia uma forma única
--   de buscar ambos com contexto completo para a home page unificada.
--
-- Solução:
--   Criar RPC que retorna work_items de ambos os contextos com:
--   - Contexto de projeto (project_name, template_type)
--   - Contexto de OKR (key_result_title, deliverable_title, objective_title, cycle_label)
--   - Urgency_score para ordenação inteligente
--   - Filtros por data (from, to)
--
-- Impacto:
--   - Mínimo: apenas criação de nova RPC
--   - Sem alterações em tabelas existentes
--   - Sem alterações em RLS policies
--   - Idempotente (CREATE OR REPLACE)
--
-- Fonte:
--   work_items é a fonte única de verdade para execução
--   Esta função suporta os dois contextos: projetos e OKRs
-- ============================================================================

-- ============================================================================
-- DROP da função existente (se houver) para permitir recriação
-- ============================================================================
DROP FUNCTION IF EXISTS public.work_items_for_user_unified(uuid, date, date);

-- ============================================================================
-- RPC: public.work_items_for_user_unified
-- ============================================================================
-- Propósito: Retornar work_items de um usuário com contexto unificado
-- Usado por: Home page unificada (ADMIN, HEAD, COLLABORATOR)
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
--   - projects → project_name, template_type
--   - okr_key_results → key_result_title, objective_id
--   - okr_objectives → objective_title, cycle_id
--   - okr_cycles → cycle_label
--   - okr_deliverables → deliverable_title
--
-- Urgency Score (para ordenação):
--   - Tarefas atrasadas (due_date < today): score = 1000 + dias_atraso
--   - Tarefas para hoje (due_date = today): score = 100
--   - Tarefas para esta semana (due_date <= hoje + 7): score = 50 + dias_restantes
--   - Tarefas futuras (due_date > hoje + 7): score = 0 + dias_restantes
--   - Tarefas sem due_date: score = 9999 (mostrar no final)
--   - Prioridade (URGENT = -50, HIGH = -25, MEDIUM = 0, LOW = 25)
--
-- Ordenação:
--   - urgency_score ASC (tarefas mais urgentes primeiro)
--   - priority (URGENT, HIGH, MEDIUM, LOW)
--   - due_date ASC NULLS LAST
--   - created_at DESC (tarefas mais recentes depois)
--
-- Campos de retorno:
--   - Todos os campos de work_items
--   - project_name, project_template_type (contexto de projeto)
--   - key_result_title, deliverable_title (contexto de OKR)
--   - objective_title, cycle_label (contexto de objetivo)
--   - urgency_score (para ordenação)
--   - is_overdue (boolean para facilitar filtros)
--   - is_today (boolean para facilitar filtros)
--   - is_this_week (boolean para facilitar filtros)
--
-- Segurança:
--   - SECURITY DEFINER para bypass RLS (controlado por assignee_user_id)
--   - Parâmetro p_user_id controla acesso (não usa auth.uid())
--   - Somente retorna itens do usuário especificado
-- ============================================================================

CREATE OR REPLACE FUNCTION public.work_items_for_user_unified(
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
  -- Contexto de projeto
  project_name text,
  project_template_type text,
  -- Contexto de Key Result
  key_result_title text,
  -- Contexto de Deliverable
  deliverable_title text,
  -- Contexto de Objetivo
  objective_title text,
  -- Label do ciclo (ex: "Q1/2026" ou "2026")
  cycle_label text,
  -- Contexto para ordenação
  urgency_score integer,
  is_overdue boolean,
  is_today boolean,
  is_this_week boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  today_date date;
  priority_weight integer;
BEGIN
  today_date := CURRENT_DATE;

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
    p.template_type AS project_template_type,
    -- Contexto de Key Result
    kr.title AS key_result_title,
    -- Contexto de Deliverable
    od.title AS deliverable_title,
    -- Contexto de Objetivo
    oo.title AS objective_title,
    -- Label do ciclo (ex: "Q1/2026" ou "2026")
    CASE
      WHEN oc.type = 'QUARTERLY' THEN 'Q' || oc.quarter || '/' || oc.year
      ELSE oc.year::text
    END AS cycle_label,
    -- Urgency Score
    CASE
      -- Peso da prioridade
      WHEN wi.priority = 'URGENT' THEN -50
      WHEN wi.priority = 'HIGH' THEN -25
      WHEN wi.priority = 'MEDIUM' THEN 0
      WHEN wi.priority = 'LOW' THEN 25
      ELSE 0
    END
    -- Peso baseado na data de vencimento
    + CASE
      WHEN wi.due_date IS NULL THEN 9999  -- Sem data: mostrar no final
      WHEN (wi.due_date)::date < today_date THEN 1000 + (today_date - (wi.due_date)::date)  -- Atrasado: 1000 + dias de atraso
      WHEN (wi.due_date)::date = today_date THEN 100  -- Hoje: score 100
      WHEN (wi.due_date)::date <= (today_date + INTERVAL '7 days')::date THEN 50 + ((wi.due_date)::date - today_date)  -- Esta semana: 50 + dias restantes
      ELSE ((wi.due_date)::date - today_date)  -- Futuro: apenas dias restantes
    END AS urgency_score,
    -- Flags para facilitar filtros
    CASE WHEN wi.due_date IS NOT NULL AND (wi.due_date)::date < today_date THEN true ELSE false END AS is_overdue,
    CASE WHEN wi.due_date IS NOT NULL AND (wi.due_date)::date = today_date THEN true ELSE false END AS is_today,
    CASE WHEN wi.due_date IS NOT NULL AND (wi.due_date)::date <= (today_date + INTERVAL '7 days')::date THEN true ELSE false END AS is_this_week
  FROM public.work_items wi
  -- Join com projects (opcional, para project_name e template_type)
  LEFT JOIN public.projects p
    ON p.id = wi.project_id
  -- Join com okr_key_results (opcional, para key_result_title e objective_id)
  LEFT JOIN public.okr_key_results kr
    ON kr.id = wi.key_result_id
  -- Join com okr_deliverables (opcional, para deliverable_title)
  LEFT JOIN public.okr_deliverables od
    ON od.id = wi.deliverable_id
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
    urgency_score ASC,
    CASE wi.priority
      WHEN 'URGENT' THEN 1
      WHEN 'HIGH' THEN 2
      WHEN 'MEDIUM' THEN 3
      WHEN 'LOW' THEN 4
      ELSE 5
    END ASC,
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
    WHERE proname = 'work_items_for_user_unified'
      AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public')
  ) INTO function_exists;

  IF function_exists THEN
    RAISE NOTICE 'RPC work_items_for_user_unified criada com sucesso!';
  ELSE
    RAISE NOTICE 'ERRO: RPC work_items_for_user_unified não foi criada!';
  END IF;
END $$;

-- ============================================================================
-- Exemplo de uso (comentado - apenas para documentação)
-- ============================================================================
-- SELECT * FROM public.work_items_for_user_unified(
--   p_user_id := 'user-uuid'::uuid,
--   p_from := '2026-01-01'::date,
--   p_to := '2026-01-31'::date
-- );
