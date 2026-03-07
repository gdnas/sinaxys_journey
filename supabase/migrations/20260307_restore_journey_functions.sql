-- ============================================================================
-- MIGRATION: Restaurar funções originais de trilhas (sem dependência de event ledger)
-- ============================================================================
-- Esta migration remove a dependência das funções de trilhas do company_event_ledger
-- para restaurar a funcionalidade básica das trilhas

-- 1. Restaurar função complete_module original (sem registro de eventos)
CREATE OR REPLACE FUNCTION public.complete_module(p_assignment_id UUID, p_module_id UUID, p_checkpoint_answer TEXT DEFAULT NULL, p_earned_xp INTEGER DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE a record;
DECLARE t record;
DECLARE dept_name text;
DECLARE user_name text;
DECLARE next_mp_id uuid;
DECLARE done_count int;
DECLARE total_count int;
BEGIN
  PERFORM set_config('row_security','off', true);

  SELECT * INTO a FROM public.track_assignments WHERE id = p_assignment_id;
  IF a IS NULL THEN RAISE EXCEPTION 'Assignment não encontrado.'; END IF;

  -- Only owner can complete (MASTERADMIN allowed for support)
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado.'; END IF;
  IF auth.uid() <> a.user_id AND NOT public.is_masteradmin() THEN
    RAISE EXCEPTION 'Sem permissão.';
  END IF;

  -- Update module progress (must be AVAILABLE)
  UPDATE public.module_progress mp
    SET status = 'COMPLETED',
        completed_at = now(),
        checkpoint_answer_text = COALESCE(p_checkpoint_answer, mp.checkpoint_answer_text),
        earned_xp = COALESCE(p_earned_xp, mp.earned_xp)
  WHERE mp.assignment_id = p_assignment_id
    AND mp.module_id = p_module_id
    AND mp.status = 'AVAILABLE';

  -- Ensure assignment started
  IF a.status = 'NOT_STARTED' OR a.status = 'LOCKED' THEN
    UPDATE public.track_assignments
      SET status = 'IN_PROGRESS',
          started_at = COALESCE(started_at, now())
    WHERE id = p_assignment_id;
  END IF;

  -- Unlock next if none available
  IF NOT EXISTS (
    SELECT 1 FROM public.module_progress WHERE assignment_id = p_assignment_id AND status = 'AVAILABLE'
  ) THEN
    SELECT mp.id INTO next_mp_id
    FROM public.module_progress mp
    JOIN public.track_modules m ON m.id = mp.module_id
    WHERE mp.assignment_id = p_assignment_id
      AND mp.status = 'LOCKED'
    ORDER BY m.order_index ASC
    LIMIT 1;

    IF next_mp_id IS NOT NULL THEN
      UPDATE public.module_progress SET status = 'AVAILABLE'
      WHERE id = next_mp_id;
    END IF;
  END IF;

  -- Completion check
  SELECT COUNT(*) FILTER (WHERE status = 'COMPLETED'), COUNT(*)
    INTO done_count, total_count
  FROM public.module_progress
  WHERE assignment_id = p_assignment_id;

  IF total_count > 0 AND done_count = total_count THEN
    UPDATE public.track_assignments
      SET status = 'COMPLETED',
          completed_at = COALESCE(completed_at, now())
    WHERE id = p_assignment_id;

    -- Create certificate if missing
    IF NOT EXISTS (SELECT 1 FROM public.certificates WHERE assignment_id = p_assignment_id) THEN
      SELECT * INTO t FROM public.learning_tracks WHERE id = a.track_id;
      SELECT name INTO dept_name FROM public.departments WHERE id = t.department_id;
      SELECT name INTO user_name FROM public.profiles WHERE id = a.user_id;

      INSERT INTO public.certificates (
        assignment_id,
        certificate_code,
        issued_at,
        public_slug,
        snapshot_user_name,
        snapshot_track_title,
        snapshot_department_name
      ) VALUES (
        p_assignment_id,
        public.generate_cert_code(),
        now(),
        public.slugify_simple(coalesce(user_name,'user')) || '-' || public.slugify_simple(coalesce(t.title,'track')) || '-' || substr(replace(gen_random_uuid()::text,'-',''),1,6),
        coalesce(user_name,''),
        coalesce(t.title,''),
        coalesce(dept_name,'')
      );
    END IF;
  END IF;
END;
$function$;

-- 2. Restaurar função submit_quiz_attempt original (sem registro de eventos)
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(p_assignment_id UUID, p_module_id UUID, p_score INTEGER, p_passed BOOLEAN, p_earned_xp INTEGER DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE a record;
BEGIN
  PERFORM set_config('row_security','off', true);

  SELECT * INTO a FROM public.track_assignments WHERE id = p_assignment_id;
  IF a IS NULL THEN RAISE EXCEPTION 'Assignment não encontrado.'; END IF;

  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado.'; END IF;
  IF auth.uid() <> a.user_id AND NOT public.is_masteradmin() THEN
    RAISE EXCEPTION 'Sem permissão.';
  END IF;

  -- Always register attempt
  UPDATE public.module_progress mp
    SET attempts_count = attempts_count + 1,
        score = p_score,
        passed = p_passed
  WHERE mp.assignment_id = p_assignment_id
    AND mp.module_id = p_module_id
    AND mp.status = 'AVAILABLE';

  IF p_passed THEN
    PERFORM public.complete_module(p_assignment_id, p_module_id, NULL, p_earned_xp);
  END IF;
END;
$function$;

-- 3. Restaurar função on_okr_task_done_award_points original (sem registro de eventos)
CREATE OR REPLACE FUNCTION public.on_okr_task_done_award_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  cid uuid;
  pts_done int;
  pts_ontime int;
  on_time boolean;
BEGIN
  PERFORM set_config('row_security','off', true);

  IF TG_OP <> 'UPDATE' THEN
    RETURN NEW;
  END IF;

  IF NEW.status = 'DONE' AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    SELECT o.company_id INTO cid
    FROM public.okr_tasks t
    JOIN public.okr_deliverables d ON d.id = t.deliverable_id
    JOIN public.okr_key_results kr ON kr.id = d.key_result_id
    JOIN public.okr_objectives o ON o.id = kr.objective_id
    WHERE t.id = NEW.id;

    IF cid IS NULL THEN
      RETURN NEW;
    END IF;

    SELECT pr.points INTO pts_done
    FROM public.points_rules pr
    WHERE pr.company_id = cid AND pr.key = 'OKR_TASK_DONE' AND pr.active = true
    LIMIT 1;

    IF pts_done IS NULL THEN
      pts_done := 10;
    END IF;

    SELECT pr.points INTO pts_ontime
    FROM public.points_rules pr
    WHERE pr.company_id = cid AND pr.key = 'OKR_TASK_ON_TIME' AND pr.active = true
    LIMIT 1;

    IF pts_ontime IS NULL THEN
      pts_ontime := 20;
    END IF;

    on_time := (NEW.due_date IS NOT NULL AND NEW.completed_at IS NOT NULL AND (NEW.completed_at::date <= NEW.due_date));

    INSERT INTO public.points_events(company_id, user_id, rule_key, points, note, created_by_user_id, okr_task_id)
    VALUES (cid, NEW.owner_user_id, 'OKR_TASK_DONE', pts_done, 'OKR: tarefa concluída', auth.uid(), NEW.id)
    ON CONFLICT DO NOTHING;

    IF on_time THEN
      INSERT INTO public.points_events(company_id, user_id, rule_key, points, note, created_by_user_id, okr_task_id)
      VALUES (cid, NEW.owner_user_id, 'OKR_TASK_ON_TIME', pts_ontime, 'OKR: tarefa no prazo', auth.uid(), NEW.id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;