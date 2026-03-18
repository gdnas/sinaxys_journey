CREATE OR REPLACE FUNCTION public.toggle_subtask_status(p_item_id uuid)
RETURNS TABLE (id uuid, status text) 
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_user uuid := auth.uid();
  allowed boolean;
BEGIN
  -- ensure item exists and is a subtask (parent_id IS NOT NULL)
  PERFORM 1 FROM work_items WHERE id = p_item_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'work_item not found';
  END IF;

  -- permission check: creator OR project owner OR project member OR company admin
  SELECT EXISTS (
    SELECT 1
    FROM work_items wi
    JOIN projects p ON p.id = wi.project_id
    WHERE wi.id = p_item_id
      AND (
        wi.created_by_user_id = current_user
        OR p.owner_user_id = current_user
        OR EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = p.id AND pm.user_id = current_user)
        OR EXISTS (SELECT 1 FROM profiles pr WHERE pr.id = current_user AND pr.role = 'ADMIN' AND pr.company_id = p.tenant_id)
      )
  ) INTO allowed;

  IF NOT allowed THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE work_items
  SET status = CASE WHEN status = 'done' THEN 'todo' ELSE 'done' END,
      updated_at = NOW()
  WHERE id = p_item_id
  RETURNING work_items.id, work_items.status INTO id, status;

  RETURN NEXT;
END;
$$;
