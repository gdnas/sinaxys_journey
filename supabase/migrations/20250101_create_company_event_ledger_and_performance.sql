-- =====================================================
-- 1. Criar tabela company_event_ledger
-- =====================================================

CREATE TABLE IF NOT EXISTS public.company_event_ledger (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  user_id UUID NOT NULL,
  source_module TEXT NOT NULL, -- 'OKR' | 'TRACKS' | 'POINTS' | 'PDI'
  event_type TEXT NOT NULL,
  entity_type TEXT NOT NULL, -- 'task' | 'deliverable' | 'key_result' | 'objective' | 'module' | 'assignment' | 'checkin' | 'one_on_one' | 'feedback' | 'bonus'
  entity_id TEXT, -- ID da entidade relacionada
  payload JSONB DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_company_event_ledger_company_user ON public.company_event_ledger(company_id, user_id);
CREATE INDEX IF NOT EXISTS idx_company_event_ledger_event_type ON public.company_event_ledger(company_id, event_type);
CREATE INDEX IF NOT EXISTS idx_company_event_ledger_occurred_at ON public.company_event_ledger(occurred_at DESC);

-- Unique constraint para idempotência (evita duplicatas do mesmo evento no mesmo dia)
CREATE UNIQUE INDEX IF NOT EXISTS idx_company_event_ledger_unique_event 
  ON public.company_event_ledger(company_id, user_id, event_type, entity_type, entity_id, occurred_at::date)
  WHERE entity_id IS NOT NULL;

-- Habilitar RLS
ALTER TABLE public.company_event_ledger ENABLE ROW LEVEL SECURITY;

-- Políticas RLS
CREATE POLICY "company_event_ledger_select_company" 
  ON public.company_event_ledger 
  FOR SELECT 
  USING (is_member_of_company(company_id));

CREATE POLICY "company_event_ledger_insert_system" 
  ON public.company_event_ledger 
  FOR INSERT 
  WITH CHECK (true); -- Permite inserção via triggers/RPCs (os checks de permissão são feitos na origem)

-- =====================================================
-- 2. Criar tabela performance_scores
-- =====================================================

CREATE TABLE IF NOT EXISTS public.performance_scores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  user_id UUID NOT NULL,
  cycle_id UUID NOT NULL, -- okr_cycle ou NULL para período global
  score NUMERIC(5,2) NOT NULL DEFAULT 0,
  breakdown JSONB DEFAULT '{}'::jsonb,
  execution_score NUMERIC(5,2) DEFAULT 0,
  result_score NUMERIC(5,2) DEFAULT 0,
  learning_score NUMERIC(5,2) DEFAULT 0,
  consistency_score NUMERIC(5,2) DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(company_id, user_id, cycle_id)
);

CREATE INDEX IF NOT EXISTS idx_performance_scores_company_user_cycle 
  ON public.performance_scores(company_id, user_id, cycle_id);

-- Habilitar RLS
ALTER TABLE public.performance_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "performance_scores_select_company" 
  ON public.performance_scores 
  FOR SELECT 
  USING (is_member_of_company(company_id));

-- =====================================================
-- 3. Função para registrar eventos no ledger
-- =====================================================

CREATE OR REPLACE FUNCTION public.record_company_event(
  p_company_id UUID,
  p_user_id UUID,
  p_source_module TEXT,
  p_event_type TEXT,
  p_entity_type TEXT,
  p_entity_id TEXT DEFAULT NULL,
  p_payload JSONB DEFAULT '{}'::jsonb,
  p_occurred_at TIMESTAMPTZ DEFAULT NOW()
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event_id UUID;
BEGIN
  -- Verificar se o evento já existe (idempotência)
  INSERT INTO public.company_event_ledger (
    company_id, user_id, source_module, event_type, 
    entity_type, entity_id, payload, occurred_at
  )
  VALUES (
    p_company_id, p_user_id, p_source_module, p_event_type,
    p_entity_type, p_entity_id, p_payload, p_occurred_at
  )
  ON CONFLICT (company_id, user_id, event_type, entity_type, entity_id, occurred_at::date)
  DO UPDATE SET
    payload = EXCLUDED.payload,
    created_at = NOW()
  RETURNING id INTO v_event_id;
  
  RETURN v_event_id;
END;
$$;

-- =====================================================
-- 4. Função para processar evento e derivar pontos
-- =====================================================

CREATE OR REPLACE FUNCTION public.process_event_to_points(p_event_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_event RECORD;
  v_rule RECORD;
  v_points INTEGER;
  v_note TEXT;
  v_okr_objective_id UUID;
  v_okr_task_id UUID;
  v_assignment_id UUID;
  v_module_id UUID;
BEGIN
  -- Buscar o evento
  SELECT * INTO v_event 
  FROM public.company_event_ledger 
  WHERE id = p_event_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  -- Buscar regra de pontos baseada no event_type
  SELECT * INTO v_rule
  FROM public.points_rules
  WHERE company_id = v_event.company_id
    AND key = v_event.event_type
    AND active = true
  LIMIT 1;
  
  -- Se não tiver regra específica, usar defaults
  IF v_rule IS NULL THEN
    v_points := 0;
    v_note := NULL;
  ELSE
    v_points := v_rule.points;
    v_note := v_rule.label;
  END IF;
  
  -- Extrair IDs do payload
  v_assignment_id := (v_event.payload->>'assignment_id')::UUID;
  v_module_id := (v_event.payload->>'module_id')::UUID;
  v_okr_task_id := (v_event.payload->>'task_id')::UUID;
  v_okr_objective_id := (v_event.payload->>'objective_id')::UUID;
  
  -- Inserir points_event se houver pontos
  IF v_points > 0 THEN
    INSERT INTO public.points_events (
      company_id, user_id, rule_key, points, note,
      created_by_user_id, assignment_id, module_id,
      okr_task_id, okr_objective_id
    )
    VALUES (
      v_event.company_id,
      v_event.user_id,
      v_event.event_type,
      v_points,
      COALESCE(v_note, v_event.payload->>'note'),
      v_event.user_id,
      v_assignment_id,
      v_module_id,
      v_okr_task_id,
      v_okr_objective_id
    )
    ON CONFLICT DO NOTHING; -- Evita duplicatas
  END IF;
END;
$$;

-- =====================================================
-- 5. Trigger para processar eventos automaticamente
-- =====================================================

CREATE OR REPLACE FUNCTION public.on_company_event_ledger_insert_derive_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Processar o evento para derivar pontos
  PERFORM public.process_event_to_points(NEW.id);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_company_event_ledger_derive_points
  AFTER INSERT ON public.company_event_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.on_company_event_ledger_insert_derive_points();

-- =====================================================
-- 6. Função para calcular performance_score de um usuário
-- =====================================================

CREATE OR REPLACE FUNCTION public.calculate_user_performance(
  p_company_id UUID,
  p_user_id UUID,
  p_cycle_id UUID DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_execution_score NUMERIC;
  v_result_score NUMERIC;
  v_learning_score NUMERIC;
  v_consistency_score NUMERIC;
  v_total_score NUMERIC;
  v_breakdown JSONB;
BEGIN
  -- Execução: tarefas OKR concluídas + entregáveis concluídos
  SELECT COALESCE(SUM(
    CASE 
      WHEN (payload->>'status') = 'DONE' THEN 10
      ELSE 0
    END
  ), 0) INTO v_execution_score
  FROM public.company_event_ledger
  WHERE company_id = p_company_id
    AND user_id = p_user_id
    AND source_module = 'OKR'
    AND entity_type IN ('task', 'deliverable')
    AND (p_cycle_id IS NULL OR (payload->>'cycle_id')::UUID = p_cycle_id);
  
  -- Resultado: progresso de KR e objetivos atingidos
  SELECT COALESCE(SUM(
    CASE 
      WHEN event_type = 'OKR_ACHIEVED' THEN 50
      WHEN event_type = 'KR_ACHIEVED' THEN 30
      WHEN event_type = 'KR_PROGRESS' THEN 5
      ELSE 0
    END
  ), 0) INTO v_result_score
  FROM public.company_event_ledger
  WHERE company_id = p_company_id
    AND user_id = p_user_id
    AND source_module = 'OKR'
    AND (p_cycle_id IS NULL OR (payload->>'cycle_id')::UUID = p_cycle_id);
  
  -- Aprendizado: módulos concluídos + quizzes aprovados
  SELECT COALESCE(SUM(
    CASE 
      WHEN event_type = 'MODULE_COMPLETED' THEN 20
      WHEN event_type = 'QUIZ_PASSED' THEN 15
      ELSE 0
    END
  ), 0) INTO v_learning_score
  FROM public.company_event_ledger
  WHERE company_id = p_company_id
    AND user_id = p_user_id
    AND source_module = 'TRACKS'
    AND (p_cycle_id IS NULL OR (payload->>'cycle_id')::UUID = p_cycle_id);
  
  -- Consistência: checkins e 1:1 realizados
  SELECT COALESCE(SUM(
    CASE 
      WHEN event_type = 'CHECKIN_CREATED' THEN 5
      WHEN event_type = 'ONE_ON_ONE_CREATED' THEN 10
      ELSE 0
    END
  ), 0) INTO v_consistency_score
  FROM public.company_event_ledger
  WHERE company_id = p_company_id
    AND user_id = p_user_id
    AND source_module = 'PDI'
    AND (p_cycle_id IS NULL OR (payload->>'cycle_id')::UUID = p_cycle_id);
  
  -- Calcular score total (normalizado)
  v_total_score := (
    COALESCE(v_execution_score, 0) * 0.3 +
    COALESCE(v_result_score, 0) * 0.3 +
    COALESCE(v_learning_score, 0) * 0.25 +
    COALESCE(v_consistency_score, 0) * 0.15
  );
  
  -- Construir breakdown
  v_breakdown := jsonb_build_object(
    'execution', v_execution_score,
    'result', v_result_score,
    'learning', v_learning_score,
    'consistency', v_consistency_score
  );
  
  -- Upsert performance_scores
  INSERT INTO public.performance_scores (
    company_id, user_id, cycle_id,
    score, execution_score, result_score,
    learning_score, consistency_score, breakdown
  )
  VALUES (
    p_company_id, p_user_id, p_cycle_id,
    v_total_score, v_execution_score, v_result_score,
    v_learning_score, v_consistency_score, v_breakdown
  )
  ON CONFLICT (company_id, user_id, cycle_id)
  DO UPDATE SET
    score = EXCLUDED.score,
    execution_score = EXCLUDED.execution_score,
    result_score = EXCLUDED.result_score,
    learning_score = EXCLUDED.learning_score,
    consistency_score = EXCLUDED.consistency_score,
    breakdown = EXCLUDED.breakdown,
    updated_at = NOW();
  
  RETURN jsonb_build_object(
    'total_score', v_total_score,
    'execution_score', v_execution_score,
    'result_score', v_result_score,
    'learning_score', v_learning_score,
    'consistency_score', v_consistency_score,
    'breakdown', v_breakdown
  );
END;
$$;

-- =====================================================
-- 7. Trigger para recalcular performance após novo evento
-- =====================================================

CREATE OR REPLACE FUNCTION public.on_company_event_ledger_update_performance()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_cycle_id UUID;
BEGIN
  -- Extrair cycle_id do payload se existir
  v_cycle_id := (NEW.payload->>'cycle_id')::UUID;
  
  -- Recalcular performance
  PERFORM public.calculate_user_performance(NEW.company_id, NEW.user_id, v_cycle_id);
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_company_event_ledger_update_performance
  AFTER INSERT ON public.company_event_ledger
  FOR EACH ROW
  EXECUTE FUNCTION public.on_company_event_ledger_update_performance();

-- =====================================================
-- 8. RPC para recalcular performance em batch
-- =====================================================

CREATE OR REPLACE FUNCTION public.recalculate_all_performances(p_company_id UUID, p_cycle_id UUID DEFAULT NULL)
RETURNS TABLE(user_id UUID, updated_at TIMESTAMPTZ)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id UUID;
BEGIN
  -- Para cada usuário com eventos na empresa
  FOR v_user_id IN 
    SELECT DISTINCT user_id
    FROM public.company_event_ledger
    WHERE company_id = p_company_id
  LOOP
    -- Calcular performance
    PERFORM public.calculate_user_performance(p_company_id, v_user_id, p_cycle_id);
    
    RETURN NEXT;
  END LOOP;
  
  RETURN;
END;
$$;

-- =====================================================
-- 9. Modificar triggers existentes para registrar eventos
-- =====================================================

-- TRACKS: complete_module
CREATE OR REPLACE FUNCTION public.complete_module_with_event(
  p_assignment_id UUID,
  p_module_id UUID,
  p_checkpoint_answer TEXT DEFAULT NULL,
  p_earned_xp INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  a RECORD;
  m RECORD;
  dept_name TEXT;
  user_name TEXT;
  next_mp_id UUID;
  done_count INT;
  total_count INT;
BEGIN
  PERFORM set_config('row_security','off', true);

  SELECT * INTO a FROM public.track_assignments WHERE id = p_assignment_id;
  IF a IS NULL THEN RAISE EXCEPTION 'Assignment não encontrado.'; END IF;

  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado.'; END IF;
  IF auth.uid() <> a.user_id AND NOT public.is_masteradmin() THEN
    RAISE EXCEPTION 'Sem permissão.';
  END IF;

  UPDATE public.module_progress mp
    SET status = 'COMPLETED',
        completed_at = now(),
        checkpoint_answer_text = COALESCE(p_checkpoint_answer, mp.checkpoint_answer_text),
        earned_xp = COALESCE(p_earned_xp, mp.earned_xp)
  WHERE mp.assignment_id = p_assignment_id
    AND mp.module_id = p_module_id
    AND mp.status = 'AVAILABLE';

  IF a.status = 'NOT_STARTED' OR a.status = 'LOCKED' THEN
    UPDATE public.track_assignments
      SET status = 'IN_PROGRESS',
          started_at = COALESCE(started_at, now())
    WHERE id = p_assignment_id;
  END IF;

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

  SELECT COUNT(*) FILTER (WHERE status = 'COMPLETED'), COUNT(*)
    INTO done_count, total_count
  FROM public.module_progress
  WHERE assignment_id = p_assignment_id;

  IF total_count > 0 AND done_count = total_count THEN
    UPDATE public.track_assignments
      SET status = 'COMPLETED',
          completed_at = COALESCE(completed_at, now())
    WHERE id = p_assignment_id;

    IF NOT EXISTS (SELECT 1 FROM public.certificates WHERE assignment_id = p_assignment_id) THEN
      SELECT * INTO t FROM public.learning_tracks WHERE id = a.track_id;
      SELECT name INTO dept_name FROM public.departments WHERE id = t.department_id;
      SELECT name INTO user_name FROM public.profiles WHERE id = a.user_id;

      INSERT INTO public.certificates (
        assignment_id, certificate_code, issued_at, public_slug,
        snapshot_user_name, snapshot_track_title, snapshot_department_name
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
  
  -- Registra evento no ledger
  PERFORM public.record_company_event(
    a.company_id,
    a.user_id,
    'TRACKS',
    'MODULE_COMPLETED',
    'module',
    p_module_id::TEXT,
    jsonb_build_object(
      'assignment_id', p_assignment_id,
      'module_id', p_module_id,
      'earned_xp', COALESCE(p_earned_xp, 0)
    ),
    now()
  );
END;
$$;

-- Criar wrapper para backward compatibility
CREATE OR REPLACE FUNCTION public.complete_module(p_assignment_id UUID, p_module_id UUID, p_checkpoint_answer TEXT DEFAULT NULL, p_earned_xp INTEGER DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.complete_module_with_event(p_assignment_id, p_module_id, p_checkpoint_answer, p_earned_xp);
END;
$$;

-- TRACKS: submit_quiz_attempt
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt_with_event(
  p_assignment_id UUID,
  p_module_id UUID,
  p_score INTEGER,
  p_passed BOOLEAN,
  p_earned_xp INTEGER DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  a RECORD;
  m RECORD;
BEGIN
  PERFORM set_config('row_security','off', true);

  SELECT * INTO a FROM public.track_assignments WHERE id = p_assignment_id;
  IF a IS NULL THEN RAISE EXCEPTION 'Assignment não encontrado.'; END IF;

  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Não autenticado.'; END IF;
  IF auth.uid() <> a.user_id AND NOT public.is_masteradmin() THEN
    RAISE EXCEPTION 'Sem permissão.';
  END IF;

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
  
  -- Registra evento no ledger
  IF p_passed THEN
    PERFORM public.record_company_event(
      a.company_id,
      a.user_id,
      'TRACKS',
      'QUIZ_PASSED',
      'module',
      p_module_id::TEXT,
      jsonb_build_object(
        'assignment_id', p_assignment_id,
        'module_id', p_module_id,
        'score', p_score,
        'earned_xp', COALESCE(p_earned_xp, 0)
      ),
      now()
    );
  ELSE
    PERFORM public.record_company_event(
      a.company_id,
      a.user_id,
      'TRACKS',
      'QUIZ_ATTEMPTED',
      'module',
      p_module_id::TEXT,
      jsonb_build_object(
        'assignment_id', p_assignment_id,
        'module_id', p_module_id,
        'score', p_score,
        'passed', false
      ),
      now()
    );
  END IF;
END;
$$;

-- Criar wrapper para backward compatibility
CREATE OR REPLACE FUNCTION public.submit_quiz_attempt(p_assignment_id UUID, p_module_id UUID, p_score INTEGER, p_passed BOOLEAN, p_earned_xp INTEGER DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.submit_quiz_attempt_with_event(p_assignment_id, p_module_id, p_score, p_passed, p_earned_xp);
END;
$$;

-- OKR: Atualizar trigger para registrar eventos quando task é marcada como DONE
CREATE OR REPLACE FUNCTION public.on_okr_task_done_award_points()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  cid UUID;
  pts_done INT;
  pts_ontime INT;
  on_time BOOLEAN;
  v_cycle_id UUID;
  v_obj_id UUID;
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

    -- Buscar cycle_id e objective_id para o evento
    SELECT o.id, o.cycle_id INTO v_obj_id, v_cycle_id
    FROM public.okr_tasks t
    JOIN public.okr_deliverables d ON d.id = t.deliverable_id
    JOIN public.okr_key_results kr ON kr.id = d.key_result_id
    JOIN public.okr_objectives o ON o.id = kr.objective_id
    WHERE t.id = NEW.id;

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

    -- Registra evento no ledger
    PERFORM public.record_company_event(
      cid,
      NEW.owner_user_id,
      'OKR',
      'TASK_COMPLETED',
      'task',
      NEW.id::TEXT,
      jsonb_build_object(
        'task_id', NEW.id,
        'objective_id', v_obj_id,
        'cycle_id', v_cycle_id,
        'on_time', on_time,
        'points_base', pts_done,
        'points_bonus', CASE WHEN on_time THEN pts_ontime ELSE 0 END
      ),
      NEW.completed_at
    );
  END IF;

  RETURN NEW;
END;
$$;

-- PDI: Registra checkin
CREATE OR REPLACE FUNCTION public.on_checkin_created_record_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.record_company_event(
    NEW.tenant_id,
    NEW.user_id,
    'PDI',
    'CHECKIN_CREATED',
    'checkin',
    NEW.id::TEXT,
    jsonb_build_object(
      'energy', NEW.energy,
      'motivation', NEW.motivation,
      'needs_help', NEW.needs_help
    ),
    NEW.created_at
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_checkin_created_record_event
  AFTER INSERT ON public.checkins
  FOR EACH ROW
  EXECUTE FUNCTION public.on_checkin_created_record_event();

-- PDI: Registra one_on_one
CREATE OR REPLACE FUNCTION public.on_one_on_one_created_record_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Registra para o employee
  PERFORM public.record_company_event(
    NEW.tenant_id,
    NEW.employee_id,
    'PDI',
    'ONE_ON_ONE_CREATED',
    'one_on_one',
    NEW.id::TEXT,
    jsonb_build_object('manager_id', NEW.manager_id),
    NEW.created_at
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_one_on_one_created_record_event
  AFTER INSERT ON public.one_on_one
  FOR EACH ROW
  EXECUTE FUNCTION public.on_one_on_one_created_record_event();

-- PDI: Registra feedback
CREATE OR REPLACE FUNCTION public.on_feedback_created_record_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Registra para quem recebe o feedback
  PERFORM public.record_company_event(
    NEW.tenant_id,
    NEW.to_user_id,
    'PDI',
    'FEEDBACK_RECEIVED',
    'feedback',
    NEW.id::TEXT,
    jsonb_build_object(
      'from_user_id', NEW.from_user_id,
      'kind', NEW.kind
    ),
    NEW.created_at
  );
  
  RETURN NEW;
END;
$$;

CREATE TRIGGER trigger_feedback_created_record_event
  AFTER INSERT ON public.feedbacks
  FOR EACH ROW
  EXECUTE FUNCTION public.on_feedback_created_record_event();

-- POINTS: Registra bônus manual
CREATE OR REPLACE FUNCTION public.add_points_bonus_with_event(
  p_user_id UUID,
  p_points INTEGER,
  p_note TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  my_company UUID;
BEGIN
  PERFORM set_config('row_security','off', true);

  SELECT company_id INTO my_company FROM public.profiles WHERE id = p_user_id;
  IF my_company IS NULL THEN
    RAISE EXCEPTION 'Usuário sem empresa.';
  END IF;

  IF NOT (public.is_masteradmin() OR public.is_admin_of_company(my_company)) THEN
    RAISE EXCEPTION 'Sem permissão.';
  END IF;

  -- Registra evento no ledger
  PERFORM public.record_company_event(
    my_company,
    p_user_id,
    'POINTS',
    'BONUS_GRANTED',
    'bonus',
    gen_random_uuid()::TEXT,
    jsonb_build_object(
      'points', p_points,
      'note', p_note
    ),
    now()
  );
END;
$$;

-- Criar wrapper para backward compatibility
CREATE OR REPLACE FUNCTION public.add_points_bonus(p_user_id UUID, p_points INTEGER, p_note TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  PERFORM public.add_points_bonus_with_event(p_user_id, p_points, p_note);
END;
$$;