CREATE OR REPLACE FUNCTION scan_project_work_items(p_project_id uuid)
RETURNS TABLE(
  project_id uuid,
  work_item_id uuid,
  type text,
  description text,
  action_taken text,
  created_at timestamp with time zone
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_tenant_id uuid;
BEGIN
  SELECT tenant_id INTO v_tenant_id
  FROM projects
  WHERE id = p_project_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Project not found';
  END IF;
  
  INSERT INTO work_item_inconsistencies (
    work_item_id,
    tenant_id,
    project_id,
    type,
    description,
    created_at
  )
  SELECT 
    wi.id,
    v_tenant_id,
    p_project_id,
    CASE 
      WHEN wi.status IS NULL THEN 'null_status'
      ELSE 'invalid_status'
    END,
    CASE 
      WHEN wi.status IS NULL THEN 'Work item com status NULL ou vazio'
      ELSE 'Work item com status invalido: ' || wi.status
    END,
    NOW()
  FROM work_items wi
  JOIN projects p ON p.id = wi.project_id
  WHERE wi.project_id = p_project_id
    AND (
      wi.status IS NULL OR 
      wi.status = '' OR
      wi.status NOT IN ('backlog', 'todo', 'in_progress', 'blocked', 'done')
    )
    AND NOT EXISTS (
      SELECT 1 FROM work_item_inconsistencies ii
      WHERE ii.work_item_id = wi.id
        AND ii.type = CASE 
            WHEN wi.status IS NULL THEN 'null_status'
            ELSE 'invalid_status'
          END
        AND ii.resolved_at IS NULL
    );
  
  UPDATE work_item_inconsistencies
  SET resolved_at = NOW()
  WHERE project_id = p_project_id
    AND resolved_at IS NULL
    AND NOT EXISTS (
      SELECT 1 FROM work_items wi
      WHERE wi.id = work_item_inconsistencies.work_item_id
        AND (
          wi.status IS NULL OR 
          wi.status = '' OR
          wi.status NOT IN ('backlog', 'todo', 'in_progress', 'blocked', 'done')
        )
    );
  
  RETURN QUERY
  SELECT 
    ii.project_id,
    ii.work_item_id,
    ii.type,
    ii.description,
    'created' AS action_taken,
    ii.created_at
  FROM work_item_inconsistencies ii
  WHERE ii.project_id = p_project_id
    AND ii.resolved_at IS NULL
    ORDER BY ii.created_at DESC;
END;
$$;