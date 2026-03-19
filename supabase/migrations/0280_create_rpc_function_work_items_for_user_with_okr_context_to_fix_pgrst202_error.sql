
-- ============================================================================
-- RPC: public.work_items_for_user_with_okr_context
-- ============================================================================
-- Propósito: Retornar work_items de um usuário com contexto de OKR
-- Usado por: Módulo OKR > Hoje
-- ============================================================================
-- Criação: 2025-01-15 (Correção PGRST202)
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
  due_date date,
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
  SELECT DISTINCT ON (wi.id)
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
    -- Filtro por janela de datas (opcional)
    AND (
      p_from IS NULL 
      OR wi.due_date IS NULL 
      OR wi.due_date >= p_from
    )
    AND (
      p_to IS NULL 
      OR wi.due_date IS NULL 
      OR wi.due_date <= p_to
    )
  ORDER BY 
    wi.due_date ASC NULLS LAST,
    wi.created_at DESC;
END;
$$;

-- ============================================================================
-- Garantir permissões para execução via PostgREST
-- ============================================================================
-- GRANT EXECUTE ON FUNCTION public.work_items_for_user_with_okr_context TO authenticated;
-- NOTA: Supabase PostgREST normalmente garante acesso a SECURITY DEFINER functions
-- para usuários autenticados automaticamente.
-- ============================================================================

-- ============================================================================
-- Verificação da função criada
-- ============================================================================
SELECT 
  proname as function_name,
  pg_get_function_arguments(oid) as parameters,
  pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'work_items_for_user_with_okr_context'
  AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');
