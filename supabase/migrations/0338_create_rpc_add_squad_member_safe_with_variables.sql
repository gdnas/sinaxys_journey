-- RPC: add_squad_member_safe (simplified)
CREATE OR REPLACE FUNCTION public.add_squad_member_safe(
  p_squad_id uuid,
  p_user_id uuid,
  p_allocation_percentage numeric,
  p_role text DEFAULT NULL
)
RETURNS public.squad_members
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_squad public.squads%ROWTYPE;
  v_user public.profiles%ROWTYPE;
  v_existing public.squad_members%ROWTYPE;
  v_total_allocation numeric;
  v_current_allocation numeric;
  v_message text;
BEGIN
  -- Fetch squad
  SELECT * INTO v_squad
  FROM public.squads
  WHERE id = p_squad_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Squad not found';
  END IF;

  -- Fetch user
  SELECT * INTO v_user
  FROM public.profiles
  WHERE id = p_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Validate company_id match
  IF v_squad.company_id <> v_user.company_id THEN
    RAISE EXCEPTION 'Squad and user must belong to the same company';
  END IF;

  -- Check for duplicate (squad_id, user_id)
  SELECT * INTO v_existing
  FROM public.squad_members
  WHERE squad_id = p_squad_id AND user_id = p_user_id;

  IF FOUND THEN
    RAISE EXCEPTION 'User is already a member of this squad';
  END IF;

  -- Calculate total allocation for user across all squads
  SELECT COALESCE(SUM(allocation_percentage), 0) INTO v_total_allocation
  FROM public.squad_members
  WHERE user_id = p_user_id;

  -- Save current for error message
  v_current_allocation := v_total_allocation;
  
  -- Add new allocation and check if exceeds 100%
  v_total_allocation := v_total_allocation + p_allocation_percentage;

  IF v_total_allocation > 100 THEN
    v_message := 'Total allocation for user cannot exceed 100% - current: ' || v_current_allocation || ', after adding: ' || v_total_allocation;
    RAISE EXCEPTION '%', v_message;
  END IF;

  -- Insert the new squad member
  INSERT INTO public.squad_members (
    company_id,
    squad_id,
    user_id,
    allocation_percentage,
    role
  ) VALUES (
    v_squad.company_id,
    p_squad_id,
    p_user_id,
    p_allocation_percentage,
    p_role
  ) RETURNING * INTO v_existing;

  RETURN v_existing;
END;
$$;