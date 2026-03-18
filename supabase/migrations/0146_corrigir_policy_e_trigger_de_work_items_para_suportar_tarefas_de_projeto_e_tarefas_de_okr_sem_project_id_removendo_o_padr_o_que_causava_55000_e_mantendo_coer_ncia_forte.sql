CREATE OR REPLACE FUNCTION public.can_create_work_item(
  p_tenant_id uuid,
  p_project_id uuid,
  p_key_result_id uuid,
  p_deliverable_id uuid,
  p_assignee_user_id uuid,
  p_created_by_user_id uuid
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_role text;
  v_company_id uuid;
  v_project record;
  v_okr record;
  v_deliverable record;
  v_effective_key_result_id uuid;
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

    RETURN public.can_manage_project(v_project.tenant_id, v_project.department_id, v_project.department_ids)
      OR v_project.owner_user_id = auth.uid()
      OR EXISTS (
        SELECT 1
        FROM public.project_members pm
        WHERE pm.project_id = v_project.id
          AND pm.user_id = auth.uid()
      );
  END IF;

  IF p_key_result_id IS NULL AND p_deliverable_id IS NULL THEN
    RETURN false;
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

  SELECT o.company_id, o.okr_level, o.department_id, o.owner_user_id
    INTO v_okr
  FROM public.okr_key_results kr
  JOIN public.okr_objectives o ON o.id = kr.objective_id
  WHERE kr.id = v_effective_key_result_id;

  IF v_okr.company_id IS NULL OR v_okr.company_id <> p_tenant_id THEN
    RETURN false;
  END IF;

  IF public.can_manage_okr_scope(v_okr.company_id, v_okr.okr_level, v_okr.department_id) THEN
    RETURN true;
  END IF;

  RETURN coalesce(p_assignee_user_id, auth.uid()) = auth.uid()
    AND public.can_view_okr_scope(v_okr.company_id, v_okr.okr_level, v_okr.department_id, v_okr.owner_user_id);
END;
$function$;

CREATE OR REPLACE FUNCTION public.ensure_work_item_tenant_coherence()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  proj record;
  assignee_company uuid;
  creator_company uuid;
  parent_item record;
  key_result_company uuid;
  deliverable_company uuid;
  deliverable_key_result_id uuid;
BEGIN
  IF NEW.assignee_user_id IS NOT NULL THEN
    SELECT company_id::uuid
      INTO assignee_company
    FROM public.profiles
    WHERE id = NEW.assignee_user_id;

    IF assignee_company IS NOT NULL AND assignee_company <> NEW.tenant_id THEN
      RAISE EXCEPTION 'work_item.assignee belongs to different tenant';
    END IF;
  END IF;

  IF NEW.created_by_user_id IS NOT NULL THEN
    SELECT company_id::uuid
      INTO creator_company
    FROM public.profiles
    WHERE id = NEW.created_by_user_id;

    IF creator_company IS NOT NULL AND creator_company <> NEW.tenant_id THEN
      RAISE EXCEPTION 'work_item.created_by belongs to different tenant';
    END IF;
  END IF;

  IF NEW.parent_id IS NOT NULL THEN
    SELECT id, tenant_id, project_id, key_result_id, deliverable_id
      INTO parent_item
    FROM public.work_items
    WHERE id = NEW.parent_id;

    IF parent_item.id IS NULL THEN
      RAISE EXCEPTION 'work_item.parent not found';
    END IF;

    IF parent_item.tenant_id <> NEW.tenant_id THEN
      RAISE EXCEPTION 'work_item.parent belongs to different tenant';
    END IF;

    IF NEW.project_id IS NULL THEN
      NEW.project_id := parent_item.project_id;
    ELSIF NEW.project_id IS DISTINCT FROM parent_item.project_id THEN
      RAISE EXCEPTION 'work_item.parent project mismatch';
    END IF;

    IF NEW.key_result_id IS NULL THEN
      NEW.key_result_id := parent_item.key_result_id;
    ELSIF parent_item.key_result_id IS NOT NULL AND NEW.key_result_id <> parent_item.key_result_id THEN
      RAISE EXCEPTION 'work_item.parent key_result mismatch';
    END IF;

    IF NEW.deliverable_id IS NULL THEN
      NEW.deliverable_id := parent_item.deliverable_id;
    ELSIF parent_item.deliverable_id IS NOT NULL AND NEW.deliverable_id <> parent_item.deliverable_id THEN
      RAISE EXCEPTION 'work_item.parent deliverable mismatch';
    END IF;
  END IF;

  IF NEW.deliverable_id IS NOT NULL THEN
    SELECT o.company_id::uuid, d.key_result_id
      INTO deliverable_company, deliverable_key_result_id
    FROM public.okr_deliverables d
    JOIN public.okr_key_results kr ON kr.id = d.key_result_id
    JOIN public.okr_objectives o ON o.id = kr.objective_id
    WHERE d.id = NEW.deliverable_id;

    IF deliverable_company IS NULL THEN
      RAISE EXCEPTION 'work_item.deliverable not found';
    END IF;

    IF deliverable_company <> NEW.tenant_id THEN
      RAISE EXCEPTION 'work_item.deliverable belongs to different tenant';
    END IF;

    IF NEW.key_result_id IS NULL THEN
      NEW.key_result_id := deliverable_key_result_id;
    ELSIF NEW.key_result_id <> deliverable_key_result_id THEN
      RAISE EXCEPTION 'work_item.deliverable does not belong to key_result';
    END IF;
  END IF;

  IF NEW.key_result_id IS NOT NULL THEN
    SELECT o.company_id::uuid
      INTO key_result_company
    FROM public.okr_key_results kr
    JOIN public.okr_objectives o ON o.id = kr.objective_id
    WHERE kr.id = NEW.key_result_id;

    IF key_result_company IS NULL THEN
      RAISE EXCEPTION 'work_item.key_result not found';
    END IF;

    IF key_result_company <> NEW.tenant_id THEN
      RAISE EXCEPTION 'work_item.key_result belongs to different tenant';
    END IF;
  END IF;

  IF NEW.project_id IS NOT NULL THEN
    SELECT id, tenant_id, key_result_id, deliverable_id
      INTO proj
    FROM public.projects
    WHERE id = NEW.project_id;

    IF proj.id IS NULL THEN
      RAISE EXCEPTION 'work_item.project not found';
    END IF;

    IF proj.tenant_id <> NEW.tenant_id THEN
      RAISE EXCEPTION 'work_item.project belongs to different tenant';
    END IF;

    IF NEW.key_result_id IS NULL THEN
      NEW.key_result_id := proj.key_result_id;
    ELSIF proj.key_result_id IS NOT NULL AND NEW.key_result_id <> proj.key_result_id THEN
      RAISE EXCEPTION 'work_item.key_result must match project.key_result';
    END IF;

    IF NEW.deliverable_id IS NULL THEN
      NEW.deliverable_id := proj.deliverable_id;
    ELSIF proj.deliverable_id IS NOT NULL AND NEW.deliverable_id <> proj.deliverable_id THEN
      RAISE EXCEPTION 'work_item.deliverable must match project.deliverable';
    END IF;
  END IF;

  IF NEW.project_id IS NULL AND NEW.key_result_id IS NULL AND NEW.deliverable_id IS NULL THEN
    RAISE EXCEPTION 'work_item must belong to a project, key_result or deliverable';
  END IF;

  RETURN NEW;
END;
$function$;