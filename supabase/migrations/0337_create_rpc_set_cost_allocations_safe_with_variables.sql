-- RPC: set_cost_allocations_safe (simplified)
CREATE OR REPLACE FUNCTION public.set_cost_allocations_safe(
  p_cost_item_id uuid,
  p_allocations jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost_item public.cost_items%ROWTYPE;
  v_sum numeric;
  v_count integer;
  v_allocation record;
  v_message text;
BEGIN
  -- Fetch the cost item
  SELECT * INTO v_cost_item
  FROM public.cost_items
  WHERE id = p_cost_item_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Cost item not found';
  END IF;

  -- Calculate sum of allocations from JSON
  v_sum := 0;
  v_count := 0;

  FOR v_allocation IN
    SELECT * FROM jsonb_to_recordset(p_allocations) AS x(
      department_id uuid,
      allocation_percentage numeric
    )
  LOOP
    v_sum := v_sum + v_allocation.allocation_percentage;
    v_count := v_count + 1;
  END LOOP;

  -- Validate based on is_shared
  IF v_cost_item.is_shared THEN
    -- Shared: must sum to exactly 100% and have at least 2 departments
    IF ABS(v_sum - 100) > 0.01 THEN
      v_message := 'Shared cost items must have allocations summing to exactly 100% (got: ' || v_sum || ')';
      RAISE EXCEPTION '%', v_message;
    END IF;
    IF v_count < 2 THEN
      RAISE EXCEPTION 'Shared cost items must have at least 2 department allocations';
    END IF;
  ELSE
    -- Not shared: must have exactly 1 allocation with 100%
    IF v_count <> 1 THEN
      v_message := 'Non-shared cost items must have exactly 1 allocation (got: ' || v_count || ')';
      RAISE EXCEPTION '%', v_message;
    END IF;
    IF ABS(v_sum - 100) > 0.01 THEN
      v_message := 'Non-shared cost item allocation must be exactly 100% (got: ' || v_sum || ')';
      RAISE EXCEPTION '%', v_message;
    END IF;
  END IF;

  -- Delete old allocations (in same transaction)
  DELETE FROM public.cost_allocations
  WHERE cost_item_id = p_cost_item_id;

  -- Insert new allocations (in same transaction)
  FOR v_allocation IN
    SELECT * FROM jsonb_to_recordset(p_allocations) AS x(
      department_id uuid,
      allocation_percentage numeric
    )
  LOOP
    INSERT INTO public.cost_allocations (
      company_id,
      cost_item_id,
      department_id,
      allocation_percentage
    ) VALUES (
      v_cost_item.company_id,
      p_cost_item_id,
      v_allocation.department_id,
      v_allocation.allocation_percentage
    );
  END LOOP;
END;
$$;