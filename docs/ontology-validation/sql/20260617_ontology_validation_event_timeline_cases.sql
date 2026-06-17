-- Roteiro executável de validação operacional da ontologia
-- Bloco 4/6: eventos e timeline
-- Pré-requisito: setup executado na mesma sessão.

begin;
set local role authenticated;

select 1 from pg_temp.ontology_validation_context limit 1;
select 1 from pg_temp.ontology_validation_artifacts limit 1;

do $$
declare
  v_ctx record;
  v_commitment_id uuid;
  v_dependency_id uuid;
  v_evidence_id uuid;
  v_review_id uuid;
  v_renegotiation_id uuid;
  v_event_id uuid;
  v_rows integer;
  v_is_ordered boolean;
begin

  select * into v_ctx from pg_temp.ontology_validation_context limit 1;
  v_commitment_id := (select artifact_id from pg_temp.ontology_validation_artifacts where artifact_name = 'seed_commitment');

  if v_commitment_id is null then
    raise exception 'Artefato seed_commitment não encontrado.';
  end if;

  -- Owner aceita
  perform set_config('request.jwt.claim.sub', v_ctx.owner_user_id::text, true);
  update public.commitments
  set accepted_by_owner_at = coalesce(accepted_by_owner_at, now())
  where id = v_commitment_id;

  v_event_id := public.commitment_log_event(
    v_commitment_id,
    'owner_accepted',
    jsonb_build_object('source', 'event_validation', 'actor_role', 'owner'),
    'manual_validation',
    null,
    v_ctx.owner_user_id
  );

  perform pg_temp.validation_set_artifact('event_owner_accepted', v_event_id, jsonb_build_object('actor_user_id', v_ctx.owner_user_id));

  perform pg_temp.validation_record(
    'EVT-OWNER-ACCEPTED',
    'events',
    exists(select 1 from public.commitment_events where id = v_event_id and event_type = 'owner_accepted'),
    'evento owner_accepted registrado',
    coalesce(v_event_id::text, 'null'),
    jsonb_build_object('event_id', v_event_id)
  );

  -- Receiver aceita
  perform set_config('request.jwt.claim.sub', v_ctx.receiver_user_id::text, true);
  update public.commitments
  set accepted_by_receiver_at = coalesce(accepted_by_receiver_at, now())
  where id = v_commitment_id;

  v_event_id := public.commitment_log_event(
    v_commitment_id,
    'receiver_accepted',
    jsonb_build_object('source', 'event_validation', 'actor_role', 'receiver'),
    'manual_validation',
    null,
    v_ctx.receiver_user_id
  );

  perform pg_temp.validation_set_artifact('event_receiver_accepted', v_event_id, jsonb_build_object('actor_user_id', v_ctx.receiver_user_id));

  perform pg_temp.validation_record(
    'EVT-RECEIVER-ACCEPTED',
    'events',
    exists(select 1 from public.commitment_events where id = v_event_id and event_type = 'receiver_accepted'),
    'evento receiver_accepted registrado',
    coalesce(v_event_id::text, 'null'),
    jsonb_build_object('event_id', v_event_id)
  );

  -- Ativação
  perform set_config('request.jwt.claim.sub', v_ctx.owner_user_id::text, true);
  update public.commitments
  set status = 'active'
  where id = v_commitment_id;

  v_event_id := public.commitment_log_event(
    v_commitment_id,
    'commitment_activated',
    jsonb_build_object('source', 'event_validation'),
    'manual_validation',
    null,
    v_ctx.owner_user_id
  );

  perform pg_temp.validation_set_artifact('event_commitment_activated', v_event_id, jsonb_build_object('actor_user_id', v_ctx.owner_user_id));

  perform pg_temp.validation_record(
    'EVT-COMMITMENT-ACTIVATED',
    'events',
    exists(select 1 from public.commitments where id = v_commitment_id and status = 'active' and activated_at is not null)
      and exists(select 1 from public.commitment_events where id = v_event_id and event_type = 'commitment_activated'),
    'compromisso ativo e evento de ativação registrados',
    coalesce(v_event_id::text, 'null'),
    jsonb_build_object('event_id', v_event_id)
  );

  -- Dependência + alias legado dependency_created -> dependency_added
  perform set_config('request.jwt.claim.sub', v_ctx.owner_user_id::text, true);
  insert into public.commitment_dependencies (
    tenant_id,
    commitment_id,
    dependency_kind,
    depends_on_type,
    external_label,
    is_blocking,
    status,
    created_by
  )
  values (
    v_ctx.primary_tenant_id,
    v_commitment_id,
    'approval',
    'external_condition',
    v_ctx.execution_id || ' dependency',
    true,
    'open',
    v_ctx.owner_user_id
  )
  returning id into v_dependency_id;

  perform pg_temp.validation_set_artifact('event_dependency', v_dependency_id, jsonb_build_object('actor_user_id', v_ctx.owner_user_id));

  v_event_id := public.commitment_log_event(
    v_commitment_id,
    'dependency_created',
    jsonb_build_object('dependency_id', v_dependency_id),
    'dependency',
    v_dependency_id,
    v_ctx.owner_user_id
  );

  perform pg_temp.validation_set_artifact('event_dependency_added', v_event_id, jsonb_build_object('actor_user_id', v_ctx.owner_user_id));

  perform pg_temp.validation_record(
    'EVT-DEPENDENCY-CANONICALIZED',
    'events',
    exists(
      select 1
      from public.commitment_events
      where id = v_event_id
        and event_type = 'dependency_added'
        and causation_type = 'dependency'
        and causation_id = v_dependency_id
    ),
    'alias dependency_created é canonizado para dependency_added',
    coalesce(v_event_id::text, 'null'),
    jsonb_build_object('event_id', v_event_id, 'dependency_id', v_dependency_id)
  );

  -- Evidência + alias legado evidence_attached -> evidence_added
  perform set_config('request.jwt.claim.sub', v_ctx.receiver_user_id::text, true);
  insert into public.commitment_evidence (
    tenant_id,
    commitment_id,
    evidence_type,
    title,
    description,
    payload,
    is_final,
    submitted_by
  )
  values (
    v_ctx.primary_tenant_id,
    v_commitment_id,
    'metric_snapshot',
    v_ctx.execution_id || ' timeline evidence',
    'Evidência gerada para validar timeline',
    jsonb_build_object('source', 'event_validation', 'actor_role', 'receiver'),
    false,
    v_ctx.receiver_user_id
  )
  returning id into v_evidence_id;

  perform pg_temp.validation_set_artifact('event_evidence', v_evidence_id, jsonb_build_object('actor_user_id', v_ctx.receiver_user_id));

  v_event_id := public.commitment_log_event(
    v_commitment_id,
    'evidence_attached',
    jsonb_build_object('evidence_id', v_evidence_id),
    'evidence',
    v_evidence_id,
    v_ctx.receiver_user_id
  );

  perform pg_temp.validation_set_artifact('event_evidence_added', v_event_id, jsonb_build_object('actor_user_id', v_ctx.receiver_user_id));

  perform pg_temp.validation_record(
    'EVT-EVIDENCE-CANONICALIZED',
    'events',
    exists(
      select 1
      from public.commitment_events
      where id = v_event_id
        and event_type = 'evidence_added'
        and causation_type = 'evidence'
        and causation_id = v_evidence_id
    ),
    'alias evidence_attached é canonizado para evidence_added',
    coalesce(v_event_id::text, 'null'),
    jsonb_build_object('event_id', v_event_id, 'evidence_id', v_evidence_id)
  );

  -- Review cycle + alias review_cycle_created -> review_recorded
  perform set_config('request.jwt.claim.sub', v_ctx.sponsor_user_id::text, true);
  insert into public.commitment_review_cycles (
    tenant_id,
    commitment_id,
    review_date,
    review_status,
    review_health,
    review_confidence,
    summary,
    reviewed_by
  )
  values (
    v_ctx.primary_tenant_id,
    v_commitment_id,
    now(),
    'completed',
    'at_risk',
    'medium',
    'Revisão temporária para validar timeline',
    v_ctx.sponsor_user_id
  )
  returning id into v_review_id;

  perform pg_temp.validation_set_artifact('event_review_cycle', v_review_id, jsonb_build_object('actor_user_id', v_ctx.sponsor_user_id));

  v_event_id := public.commitment_log_event(
    v_commitment_id,
    'review_cycle_created',
    jsonb_build_object('review_cycle_id', v_review_id),
    'review_cycle',
    v_review_id,
    v_ctx.sponsor_user_id
  );

  perform pg_temp.validation_set_artifact('event_review_recorded', v_event_id, jsonb_build_object('actor_user_id', v_ctx.sponsor_user_id));

  perform pg_temp.validation_record(
    'EVT-REVIEW-CANONICALIZED',
    'events',
    exists(
      select 1
      from public.commitment_events
      where id = v_event_id
        and event_type = 'review_recorded'
        and causation_type = 'review_cycle'
        and causation_id = v_review_id
    ),
    'alias review_cycle_created é canonizado para review_recorded',
    coalesce(v_event_id::text, 'null'),
    jsonb_build_object('event_id', v_event_id, 'review_cycle_id', v_review_id)
  );

  -- Renegociação + alias renegotiation_opened -> renegotiation_requested
  perform set_config('request.jwt.claim.sub', v_ctx.receiver_user_id::text, true);
  insert into public.commitment_renegotiations (
    tenant_id,
    commitment_id,
    status,
    change_scope,
    change_due_date,
    change_owner,
    change_priority,
    change_conditions,
    old_snapshot,
    proposed_snapshot,
    reason,
    requested_by
  )
  values (
    v_ctx.primary_tenant_id,
    v_commitment_id,
    'open',
    false,
    true,
    false,
    false,
    true,
    jsonb_build_object('due_date', (select due_date from public.commitments where id = v_commitment_id)),
    jsonb_build_object('due_date', now() + interval '14 days'),
    'Renegociação temporária para validar timeline',
    v_ctx.receiver_user_id
  )
  returning id into v_renegotiation_id;

  perform pg_temp.validation_set_artifact('event_renegotiation_open', v_renegotiation_id, jsonb_build_object('actor_user_id', v_ctx.receiver_user_id));

  v_event_id := public.commitment_log_event(
    v_commitment_id,
    'renegotiation_opened',
    jsonb_build_object('renegotiation_id', v_renegotiation_id),
    'renegotiation',
    v_renegotiation_id,
    v_ctx.receiver_user_id
  );

  perform pg_temp.validation_set_artifact('event_renegotiation_requested', v_event_id, jsonb_build_object('actor_user_id', v_ctx.receiver_user_id));

  perform pg_temp.validation_record(
    'EVT-RENEGOTIATION-CANONICALIZED',
    'events',
    exists(
      select 1
      from public.commitment_events
      where id = v_event_id
        and event_type = 'renegotiation_requested'
        and causation_type = 'renegotiation'
        and causation_id = v_renegotiation_id
    ),
    'alias renegotiation_opened é canonizado para renegotiation_requested',
    coalesce(v_event_id::text, 'null'),
    jsonb_build_object('event_id', v_event_id, 'renegotiation_id', v_renegotiation_id)
  );

  -- Health payload normalizado
  perform set_config('request.jwt.claim.sub', v_ctx.owner_user_id::text, true);
  v_event_id := public.commitment_log_event(
    v_commitment_id,
    'health_changed_to_overdue',
    jsonb_build_object('previous_health', 'healthy'),
    'manual_validation',
    null,
    v_ctx.owner_user_id
  );

  perform pg_temp.validation_set_artifact('event_health_changed', v_event_id, jsonb_build_object('actor_user_id', v_ctx.owner_user_id));

  perform pg_temp.validation_record(
    'EVT-HEALTH-NORMALIZED',
    'events',
    exists(
      select 1
      from public.commitment_events
      where id = v_event_id
        and event_type = 'health_changed'
        and payload ->> 'health' = 'overdue'
    ),
    'health_changed_to_overdue vira health_changed com payload normalizado',
    coalesce(v_event_id::text, 'null'),
    jsonb_build_object('event_id', v_event_id)
  );

  -- Timeline ordenada
  perform set_config('request.jwt.claim.sub', v_ctx.observer_user_id::text, true);
  with ordered as (
    select
      created_at,
      lag(created_at) over (order by created_at, id) as prev_created_at
    from public.commitment_events
    where commitment_id = v_commitment_id
  )
  select coalesce(bool_and(prev_created_at is null or created_at >= prev_created_at), true)
    into v_is_ordered
  from ordered;

  perform pg_temp.validation_record(
    'EVT-TIMELINE-ORDER',
    'events',
    coalesce(v_is_ordered, false),
    'timeline retorna eventos em ordem cronológica não decrescente',
    'is_ordered=' || coalesce(v_is_ordered::text, 'false'),
    jsonb_build_object('commitment_id', v_commitment_id)
  );

  -- Timeline visível para observer
  select count(*) into v_rows
  from public.commitment_events
  where commitment_id = v_commitment_id;

  perform pg_temp.validation_record(
    'EVT-TIMELINE-OBSERVER-READ',
    'events',
    v_rows > 0,
    'observer lê timeline do compromisso',
    'row_count=' || v_rows,
    jsonb_build_object('actor_user_id', v_ctx.observer_user_id)
  );

  -- Timeline negada para outsider
  perform set_config('request.jwt.claim.sub', v_ctx.outsider_user_id::text, true);
  select count(*) into v_rows
  from public.commitment_events
  where commitment_id = v_commitment_id;

  perform pg_temp.validation_record(
    'EVT-TIMELINE-OUTSIDER-DENY',
    'events',
    v_rows = 0,
    'usuário externo não lê timeline de outro tenant',
    'row_count=' || v_rows,
    jsonb_build_object('actor_user_id', v_ctx.outsider_user_id)
  );
end;
$$;

select *
from pg_temp.ontology_validation_results
where area = 'events'
order by recorded_at, case_id;

commit;
