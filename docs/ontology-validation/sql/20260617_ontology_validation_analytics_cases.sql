-- Roteiro executável de validação operacional da ontologia
-- Bloco 5/6: validação das views analíticas
-- Pré-requisito: setup executado na mesma sessão.

begin;
set local role authenticated;

select 1 from pg_temp.ontology_validation_context limit 1;
select 1 from pg_temp.ontology_validation_artifacts limit 1;

do $$
declare
  v_ctx record;
  v_commitment_id uuid;
  v_missing_decision_id uuid;
  v_missing_commitment_id uuid;
  v_dep_count bigint;
  v_evidence_count bigint;
  v_final_evidence_count bigint;
  v_renegotiation_count bigint;
  v_execution_link_count bigint;
  v_view_commitment_id uuid;
  v_view_open_dependencies_total bigint;
  v_view_evidence_count bigint;
  v_view_final_evidence_count bigint;
  v_view_renegotiation_count bigint;
  v_view_execution_link_count bigint;
  v_view_canonical_health text;
  v_rows integer;
begin

  select * into v_ctx from pg_temp.ontology_validation_context limit 1;
  v_commitment_id := (select artifact_id from pg_temp.ontology_validation_artifacts where artifact_name = 'seed_commitment');

  if v_commitment_id is null then
    raise exception 'Artefato seed_commitment não encontrado.';
  end if;

  perform set_config('request.jwt.claim.sub', v_ctx.owner_user_id::text, true);

  -- Forçar cenário overdue e health legado mapeado
  update public.commitments
  set due_date = now() - interval '2 days',
      health = 'overdue'
  where id = v_commitment_id;

  -- Overview consistente com tabelas-base
  select count(*) into v_dep_count
  from public.commitment_dependencies
  where commitment_id = v_commitment_id
    and status = 'open';

  select count(*) into v_evidence_count
  from public.commitment_evidence
  where commitment_id = v_commitment_id;

  select count(*) into v_final_evidence_count
  from public.commitment_evidence
  where commitment_id = v_commitment_id
    and is_final = true;

  select count(*) into v_renegotiation_count
  from public.commitment_renegotiations
  where commitment_id = v_commitment_id;

  select count(*) into v_execution_link_count
  from public.commitment_execution_links
  where commitment_id = v_commitment_id;

  select
    commitment_id,
    open_dependencies_total,
    evidence_count,
    final_evidence_count,
    renegotiation_count,
    execution_link_count,
    canonical_health
    into
      v_view_commitment_id,
      v_view_open_dependencies_total,
      v_view_evidence_count,
      v_view_final_evidence_count,
      v_view_renegotiation_count,
      v_view_execution_link_count,
      v_view_canonical_health
  from public.v_commitment_analytics_overview
  where commitment_id = v_commitment_id;

  perform pg_temp.validation_record(
    'ANA-OVERVIEW-CONSISTENCY',
    'analytics',
    v_view_commitment_id is not null
      and v_view_open_dependencies_total = v_dep_count
      and v_view_evidence_count = v_evidence_count
      and v_view_final_evidence_count = v_final_evidence_count
      and v_view_renegotiation_count = v_renegotiation_count
      and v_view_execution_link_count = v_execution_link_count
      and v_view_canonical_health = 'at_risk',
    'overview reflete contagens e canonical_health corretamente',
    coalesce(v_view_commitment_id::text, 'null'),
    jsonb_build_object(
      'expected_open_dependencies_total', v_dep_count,
      'view_open_dependencies_total', v_view_open_dependencies_total,
      'expected_evidence_count', v_evidence_count,
      'view_evidence_count', v_view_evidence_count,
      'expected_final_evidence_count', v_final_evidence_count,
      'view_final_evidence_count', v_view_final_evidence_count,
      'expected_renegotiation_count', v_renegotiation_count,
      'view_renegotiation_count', v_view_renegotiation_count,
      'expected_execution_link_count', v_execution_link_count,
      'view_execution_link_count', v_view_execution_link_count,
      'view_canonical_health', v_view_canonical_health
    )
  );

  -- Overdue
  select count(*) into v_rows
  from public.v_commitment_overdue
  where commitment_id = v_commitment_id;

  perform pg_temp.validation_record(
    'ANA-OVERDUE-VIEW',
    'analytics',
    v_rows = 1,
    'commitment overdue aparece na view de overdue',
    'row_count=' || v_rows,
    jsonb_build_object('commitment_id', v_commitment_id)
  );

  -- Renegotiation pressure
  select count(*) into v_rows
  from public.v_commitment_renegotiation_pressure
  where commitment_id = v_commitment_id;

  perform pg_temp.validation_record(
    'ANA-RENEGOTIATION-PRESSURE-VIEW',
    'analytics',
    v_rows = 1,
    'commitment com renegociação aberta aparece na view de pressure',
    'row_count=' || v_rows,
    jsonb_build_object('commitment_id', v_commitment_id)
  );

  -- Criar cenário dedicado para missing evidence + decisions without execution
  insert into public.commitment_decisions (
    tenant_id,
    title,
    description,
    decision_type,
    status,
    decided_by_user_id,
    effective_at,
    created_by
  )
  values (
    v_ctx.primary_tenant_id,
    v_ctx.execution_id || ' analytics missing evidence decision',
    'Decisão temporária para validar missing evidence e decisions without execution',
    'create',
    'approved',
    v_ctx.owner_user_id,
    now(),
    v_ctx.owner_user_id
  )
  returning id into v_missing_decision_id;

  perform pg_temp.validation_set_artifact('analytics_missing_decision', v_missing_decision_id, jsonb_build_object('actor_user_id', v_ctx.owner_user_id));

  insert into public.commitments (
    tenant_id,
    code,
    title,
    description,
    purpose,
    category,
    commitment_type,
    status,
    health,
    priority,
    acceptance_policy,
    evidence_required,
    strategic_context_type,
    origin_decision_id,
    primary_owner_user_id,
    primary_receiver_user_id,
    primary_receiver_team_id,
    created_by,
    due_date,
    fulfilled_at
  )
  values (
    v_ctx.primary_tenant_id,
    null,
    v_ctx.execution_id || ' analytics missing evidence commitment',
    'Compromisso temporário fulfilled sem evidência final para validar analytics',
    'Validar views analíticas',
    'operational',
    'bilateral',
    'fulfilled',
    'healthy',
    'medium',
    'owner_only',
    true,
    'manual',
    v_missing_decision_id,
    v_ctx.owner_user_id,
    v_ctx.receiver_user_id,
    null,
    v_ctx.owner_user_id,
    now() - interval '5 days',
    now()
  )
  returning id into v_missing_commitment_id;

  perform pg_temp.validation_set_artifact('analytics_missing_commitment', v_missing_commitment_id, jsonb_build_object('actor_user_id', v_ctx.owner_user_id));

  insert into public.commitment_parties (
    tenant_id,
    commitment_id,
    party_type,
    user_id,
    role,
    is_primary,
    acceptance_required,
    active
  )
  values
    (
      v_ctx.primary_tenant_id,
      v_missing_commitment_id,
      'user',
      v_ctx.owner_user_id,
      'owner',
      true,
      true,
      true
    ),
    (
      v_ctx.primary_tenant_id,
      v_missing_commitment_id,
      'user',
      v_ctx.receiver_user_id,
      'receiver',
      true,
      false,
      true
    );

  select count(*) into v_rows
  from public.v_commitment_missing_evidence
  where commitment_id = v_missing_commitment_id;

  perform pg_temp.validation_record(
    'ANA-MISSING-EVIDENCE-VIEW',
    'analytics',
    v_rows = 1,
    'compromisso fulfilled sem evidência final aparece em missing evidence',
    'row_count=' || v_rows,
    jsonb_build_object('commitment_id', v_missing_commitment_id)
  );

  select count(*) into v_rows
  from public.v_commitment_decisions_without_execution
  where decision_id = v_missing_decision_id;

  perform pg_temp.validation_record(
    'ANA-DECISIONS-WITHOUT-EXECUTION-VIEW',
    'analytics',
    v_rows = 1,
    'decisão vinculada sem execution links aparece em decisions_without_execution',
    'row_count=' || v_rows,
    jsonb_build_object('decision_id', v_missing_decision_id)
  );

  -- Isolamento analítico adicional
  perform set_config('request.jwt.claim.sub', v_ctx.outsider_user_id::text, true);
  select count(*) into v_rows
  from public.v_commitment_missing_evidence
  where commitment_id = v_missing_commitment_id
    and tenant_id = v_ctx.primary_tenant_id;

  perform pg_temp.validation_record(
    'ANA-MISSING-EVIDENCE-ISOLATION',
    'analytics',
    v_rows = 0,
    'tenant externo não vê linhas em missing_evidence do tenant primário',
    'row_count=' || v_rows,
    jsonb_build_object('outsider_user_id', v_ctx.outsider_user_id)
  );
end;
$$;

select *
from pg_temp.ontology_validation_results
where area = 'analytics'
order by recorded_at, case_id;

commit;
