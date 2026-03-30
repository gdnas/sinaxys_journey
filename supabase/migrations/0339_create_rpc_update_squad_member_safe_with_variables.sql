-- RPC: update_squad_member_safe (simplified)
CREATE OR REPLACE FUNCTION public.update_squad_member_safe(
  p_member_id uuid,
  p_allocation_percentage numeric,
  p_role text DEFAULT NULL
)
RETURNS public.squad_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_member public.squad_members%ROWTYPE;
  v_total_allocation numeric;
  v_current_allocation numeric;
  v_message text;
BEGIN
  -- Fetch current member
  SELECT * INTO v_member
  FROM public.squad_members
  WHERE id = p_member_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Squad member not found';
  END IF;

  -- Calculate total allocation for user across all squads (excluding current member)
  SELECT COALESCE(SUM(allocation_percentage), 0) INTO v_total_allocation
  FROM public.squad_members
  WHERE user_id = v_member.user_id
  AND id <> p_member_id;

  -- Save current for error message
  v_current_allocation := v_total_allocation;
  
  -- Add new allocation and check if exceeds 100%
  v_total_allocation := v_total_allocation + p_allocation_percentage;

  IF v_total_allocation > 100 THEN
    v_message := 'Total allocation for user cannot exceed 100% - current: ' || v_current_allocation || ', after updating: ' || v_total_allocation;
    RAISE EXCEPTION '%', v_message;
  END IF;

  -- Update the squad member
  UPDATE public.squad_members
  SET
    allocation_percentage = p_allocation_percentage,
    role = COALESCE(p_role, role),
    updated_at = now()
  WHERE id = p_member_id
  RETURNING * INTO v_member;

  RETURN v_member;
END;
$$;