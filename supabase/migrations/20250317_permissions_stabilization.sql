-- =====================================================
-- MIGRATION: Estabilizar Sistema de Permissões
-- =====================================================
-- Objetivo: Alinhar backend (RLS) com frontend para módulo de projetos e tarefas
--
-- Regras Implementadas:
-- - ADMIN/MASTERADMIN: tudo
-- - HEAD: escopado ao departamento
-- - COLABORADOR: ver/comentar, editar apenas work_items próprios/atribuídos

-- 1. Correção da função de gerenciamento de work_items
CREATE OR REPLACE FUNCTION public.can_manage_work_item_row(p_tenant_id uuid, p_project_id uuid, p_assignee_user_id uuid, p_created_by_user_id uuid, p_key_result_id uuid, p_deliverable_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
declare
  v_role text;
  v_company_id uuid;
  v_project record;
  v_okr record;
  v_effective_key_result_id uuid;
  v_is_colaborador boolean;
begin
  if auth.uid() is null then
    return false;
  end if;

  select role, company_id
    into v_role, v_company_id
  from public.profiles
  where id = auth.uid();

  if v_role = 'MASTERADMIN' then
    return true;
  end if;

  if v_company_id is null or p_tenant_id <> v_company_id then
    return false;
  end if;

  v_is_colaborador := (v_role = 'COLABORADOR');
  
  if v_is_colaborador then
    if p_assignee_user_id = auth.uid() or p_created_by_user_id = auth.uid() then
      return true;
    end if;
    return false;
  end if;

  if v_role = 'ADMIN' then
    return true;
  end if;

  if v_role = 'HEAD' and p_project_id is not null then
    select owner_user_id, department_id, department_ids
      into v_project
    from public.projects
    where id = p_project_id
      and tenant_id = p_tenant_id;

    if v_project.owner_user_id is null then
      return false;
    end if;

    if public.can_manage_project(p_tenant_id, v_project.department_id, v_project.department_ids) then
      return true;
    end if;
  end if;

  if p_assignee_user_id = auth.uid() or p_created_by_user_id = auth.uid() then
    return true;
  end if;

  return false;
end;
$function$;

-- 2. Correção da função de criação de work_items
CREATE OR REPLACE FUNCTION public.can_create_work_item(p_tenant_id uuid, p_project_id uuid, p_key_result_id uuid, p_deliverable_id uuid, p_assignee_user_id uuid, p_created_by_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
  v_company_id uuid;
  v_project record;
  v_okr record;
  v_deliverable record;
  v_effective_key_result_id uuid;
  v_is_colaborador boolean;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN false;
  END IF;

  SELECT role, company_id
    INTO v_role, v_company_id
  FROM public.profiles
  WHERE id = auth.uid();

  IF v_role = 'MASTERADMIN' THEN
    RETURN true;
  END IF;

  IF v_company_id IS NULL OR v_company_id <> p_tenant_id THEN
    RETURN false;
  END IF;

  IF p_created_by_user_id IS DISTINCT FROM auth.uid() THEN
    RETURN false;
  END IF;

  v_is_colaborador := (v_role = 'COLABORADOR');

  IF p_project_id IS NOT NULL THEN
    SELECT id, tenant_id, owner_user_id, department_id, department_ids, key_result_id, deliverable_id
      INTO v_project
    FROM public.projects
    WHERE id = p_project_id;

    IF v_project.id IS NULL OR v_project.tenant_id <> p_tenant_id THEN
      RETURN false;
    END IF;

    IF p_key_result_id IS NOT NULL
       AND v_project.key_result_id IS NOT NULL
       AND p_key_result_id <> v_project.key_result_id THEN
      RETURN false;
    END IF;

    IF p_deliverable_id IS NOT NULL
       AND v_project.deliverable_id IS NOT NULL
       AND p_deliverable_id <> v_project.deliverable_id THEN
      RETURN false;
    END IF;

    IF v_is_colaborador THEN
      IF EXISTS (
        SELECT 1
        FROM public.project_members pm
        WHERE pm.project_id = v_project.id
          AND pm.user_id = auth.uid()
      ) THEN
        RETURN true;
      END IF;
      
      IF v_project.owner_user_id = auth.uid() THEN
        RETURN true;
      END IF;
      
      RETURN false;
    END IF;

    RETURN public.can_manage_project(v_project.tenant_id, v_project.department_id, v_project.department_ids);
  END IF;

  IF p_deliverable_id IS NOT NULL THEN
    SELECT d.key_result_id, o.company_id, o.okr_level, o.department_id, o.owner_user_id
      INTO v_deliverable
    FROM public.okr_deliverables d
    JOIN public.okr_key_results kr ON kr.id = d.key_result_id
    JOIN public.okr_objectives o ON o.id = kr.objective_id
    WHERE d.id = p_deliverable_id;

    IF v_deliverable.key_result_id IS NULL OR v_deliverable.company_id <> p_tenant_id THEN
      RETURN false;
    END IF;

    IF p_key_result_id IS NOT NULL AND p_key_result_id <> v_deliverable.key_result_id THEN
      RETURN false;
    END IF;

    v_effective_key_result_id := v_deliverable.key_result_id;
  ELSE
    v_effective_key_result_id := p_key_result_id;
  END IF;

  IF v_effective_key_result_id IS NULL THEN
    RETURN false;
  END IF;

  IF v_is_colaborador THEN
    SELECT o.company_id, o.okr_level, o.department_id, o.owner_user_id
      INTO v_okr
    FROM public.okr_key_results kr
    JOIN public.okr_objectives o ON o.id = kr.objective_id
    WHERE kr.id = v_effective_key_result_id;

    IF v_okr.company_id IS NULL OR v_okr.company_id <> p_tenant_id THEN
      RETURN false;
    END IF;

    IF v_okr.owner_user_id = auth.uid() THEN
      RETURN true;
    END IF;

    RETURN public.can_view_okr_scope(v_okr.company_id, v_okr.okr_level, v_okr.department_id, v_okr.owner_user_id);
  END IF;

  SELECT o.company_id, o.okr_level, o.department_id, o.owner_user_id
    INTO v_okr
  FROM public.okr_key_results kr
  JOIN public.okr_objectives o ON o.id = kr.objective_id
  WHERE kr.id = v_effective_key_result_id;

  IF v_okr.company_id IS NULL OR v_okr.company_id <> p_tenant_id THEN
    RETURN false;
  END IF;

  RETURN public.can_manage_okr_scope(v_okr.company_id, v_okr.okr_level, v_okr.department_id);
END;
$function$;
