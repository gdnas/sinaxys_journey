
-- Correção das funções de RLS de work_items para tratar COLABORADOR corretamente

-- 1. can_manage_work_item_row: quem pode editar/deletar work_items
-- Regra: ADMIN/MASTERADMIN tudo, ou quem é assignee/creator, ou quem pode gerenciar o projeto

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

  -- COLABORADOR: só pode editar se for assignee/creator
  v_is_colaborador := (v_role = 'COLABORADOR');
  
  if v_is_colaborador then
    if p_assignee_user_id = auth.uid() or p_created_by_user_id = auth.uid() then
      return true;
    end if;
    return false;
  end if;

  -- ADMIN: tudo
  if v_role = 'ADMIN' then
    return true;
  end if;

  -- HEAD: pode editar se puder gerenciar o projeto
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

  -- Por padrão, assignee/creator podem editar
  if p_assignee_user_id = auth.uid() or p_created_by_user_id = auth.uid() then
    return true;
  end if;

  return false;
end;
$function$;
