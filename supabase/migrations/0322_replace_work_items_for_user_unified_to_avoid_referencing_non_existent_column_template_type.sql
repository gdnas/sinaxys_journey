CREATE OR REPLACE FUNCTION public.work_items_for_user_unified(
  p_user_id uuid,
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL
)
RETURNS TABLE (
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
  project_name text,
  project_template_type text,
  key_result_title text,
  deliverable_title text,
  objective_title text,
  cycle_label text,
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
BEGIN
  today_date := CURRENT_DATE;

  RETURN QUERY
  SELECT
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
    p.name AS project_name,
    NULL::text AS project_template_type,
    kr.title AS key_result_title,
    od.title AS deliverable_title,
    oo.title AS objective_title,
    CASE
      WHEN oc.type = 'QUARTERLY' THEN 'Q' || oc.quarter || '/' || oc.year
      ELSE oc.year::text
    END AS cycle_label,
    CASE
      WHEN wi.priority = 'URGENT' THEN -50
      WHEN wi.priority = 'HIGH' THEN -25
      WHEN wi.priority = 'MEDIUM' THEN 0
      WHEN wi.priority = 'LOW' THEN 25
      ELSE 0
    END
    + CASE
      WHEN wi.due_date IS NULL THEN 9999
      WHEN (wi.due_date)::date < today_date THEN 1000 + (today_date - (wi.due_date)::date)
      WHEN (wi.due_date)::date = today_date THEN 100
      WHEN (wi.due_date)::date <= (today_date + INTERVAL '7 days')::date THEN 50 + ((wi.due_date)::date - today_date)
      ELSE ((wi.due_date)::date - today_date)
    END AS urgency_score,
    CASE WHEN wi.due_date IS NOT NULL AND (wi.due_date)::date < today_date THEN true ELSE false END AS is_overdue,
    CASE WHEN wi.due_date IS NOT NULL AND (wi.due_date)::date = today_date THEN true ELSE false END AS is_today,
    CASE WHEN wi.due_date IS NOT NULL AND (wi.due_date)::date <= (today_date + INTERVAL '7 days')::date THEN true ELSE false END AS is_this_week
  FROM public.work_items wi
  LEFT JOIN public.projects p ON p.id = wi.project_id
  LEFT JOIN public.okr_key_results kr ON kr.id = wi.key_result_id
  LEFT JOIN public.okr_deliverables od ON od.id = wi.deliverable_id
  LEFT JOIN public.okr_objectives oo ON oo.id = kr.objective_id
  LEFT JOIN public.okr_cycles oc ON oc.id = oo.cycle_id
  WHERE wi.assignee_user_id = p_user_id
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