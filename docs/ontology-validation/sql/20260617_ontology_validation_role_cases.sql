-- Roteiro executável de validação operacional da ontologia
-- Bloco 2/6: casos por papel
-- Pré-requisito: setup executado na mesma sessão.

begin;
set local role authenticated;

select 1 from pg_temp.ontology_validation_context limit 1;
select 1 from pg_temp.ontology_validation_artifacts limit 1;

do $$
declare
  v_ctx record;
  v_commitment_id uuid;
  v_rows integer;
  v_event_id uuid;
  v_evidence_id uuid;
  v_party_id uuid;
  v_decision_id uuid;
  v_title text;
begin

  select * into v_ctx from pg_temp.ontology_validation_context limit 1;
  v_commitment_id := (select artifact_id from pg_temp.ontology_validation_artifacts where artifact_name = 'seed_commitment');

  if v_commitment_id is null then
    raise exception 'Artefato seed_commitment não encontrado.';
  end if;

  -- OWNER: leitura
  perform set_config('request.jwt.claim.sub', v_ctx.owner_user_id::text, true);
  select count(*) into v_rows
  from public.commitments
  where id = v_commitment_id;

  perform pg_temp.validation_record(
    'ROLE-OWNER-SELECT',
    'roles',
    v_rows = 1,
    'owner lê o compromisso',
    'row_count=' || v_rows,
    jsonb_build_object('actor_user_id', v_ctx.owner_user_id, 'commitment_id', v_commitment_id)
  );

  -- OWNER: update
  v_title := v_ctx.execution_id || ' owner update ok';
  update public.commitments
  set title = v_title
  where id = v_commitment_id;
  get diagnostics v_rows = row_count;

  perform pg_temp.validation_record(
    'ROLE-OWNER-UPDATE',
    'roles',
    v_rows = 1,
    'owner atualiza o compromisso',
    'row_count=' || v_rows,
    jsonb_build_object('updated_title', v_title)
  );

  -- OWNER: adiciona/remover party compatível (watcher -> observer)
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
  values (
    v_ctx.primary_tenant_id,
    v_commitment_id,
    'user',
    v_ctx.team_participant_user_id,
    'watcher',
    false,
    false,
    true
  )
  returning id into v_party_id;

  delete from public.commitment_parties
  where id = v_party_id;
  get diagnostics v_rows = row_count;

  perform pg_temp.validation_record(
    'ROLE-OWNER-PARTY-ALIAS',
    'roles',
    v_rows = 1,
    'owner adiciona e remove party compatível watcher/observer',
    'deleted_rows=' || v_rows,
    jsonb_build_object('temp_party_id', v_party_id)
  );

  -- OWNER: evento manual
  v_event_id := public.commitment_log_event(
    v_commitment_id,
    'comment_added',
    jsonb_build_object('source', 'role_case', 'actor_role', 'owner'),
    'manual_validation',
    null,
    v_ctx.owner_user_id
  );

  perform pg_temp.validation_set_artifact('role_owner_manual_event', v_event_id, jsonb_build_object('actor_user_id', v_ctx.owner_user_id));

  perform pg_temp.validation_record(
    'ROLE-OWNER-EVENT',
    'roles',
    exists(select 1 from public.commitment_events where id = v_event_id and actor_user_id = v_ctx.owner_user_id),
    'owner cria evento manual',
    coalesce(v_event_id::text, 'null'),
    jsonb_build_object('event_id', v_event_id)
  );

  -- OWNER: evidência
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
    'note',
    v_ctx.execution_id || ' owner evidence',
    'Evidência temporária criada pelo owner',
    jsonb_build_object('source', 'role_case', 'actor_role', 'owner'),
    false,
    v_ctx.owner_user_id
  )
  returning id into v_evidence_id;

  perform pg_temp.validation_set_artifact('role_owner_evidence', v_evidence_id, jsonb_build_object('actor_user_id', v_ctx.owner_user_id));

  perform pg_temp.validation_record(
    'ROLE-OWNER-EVIDENCE',
    'roles',
    v_evidence_id is not null,
    'owner adiciona evidência',
    coalesce(v_evidence_id::text, 'null'),
    jsonb_build_object('evidence_id', v_evidence_id)
  );

  -- RECEIVER: leitura
  perform set_config('request.jwt.claim.sub', v_ctx.receiver_user_id::text, true);
  select count(*) into v_rows
  from public.commitments
  where id = v_commitment_id;

  perform pg_temp.validation_record(
    'ROLE-RECEIVER-SELECT',
    'roles',
    v_rows = 1,
    'receiver lê o compromisso',
    'row_count=' || v_rows,
    jsonb_build_object('actor_user_id', v_ctx.receiver_user_id)
  );

  -- RECEIVER: evidência positiva
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
    'note',
    v_ctx.execution_id || ' receiver evidence',
    'Evidência temporária criada pelo receiver',
    jsonb_build_object('source', 'role_case', 'actor_role', 'receiver'),
    false,
    v_ctx.receiver_user_id
  )
  returning id into v_evidence_id;

  perform pg_temp.validation_set_artifact('role_receiver_evidence', v_evidence_id, jsonb_build_object('actor_user_id', v_ctx.receiver_user_id));

  perform pg_temp.validation_record(
    'ROLE-RECEIVER-EVIDENCE',
    'roles',
    v_evidence_id is not null,
    'receiver cria evidência quando commitment_can_manage = true',
    coalesce(v_evidence_id::text, 'null'),
    jsonb_build_object('evidence_id', v_evidence_id)
  );

  -- RECEIVER: mutação indevida em decisão
  update public.commitment_decisions
  set title = v_ctx.execution_id || ' receiver should not update decision'
  where id = (select artifact_id from pg_temp.ontology_validation_artifacts where artifact_name = 'seed_decision');
  get diagnostics v_rows = row_count;

  perform pg_temp.validation_record(
    'ROLE-RECEIVER-DECISION-DENY',
    'roles',
    v_rows = 0,
    'receiver não atualiza decisão que não gerencia',
    'row_count=' || v_rows,
    jsonb_build_object('decision_id', (select artifact_id from pg_temp.ontology_validation_artifacts where artifact_name = 'seed_decision'))
  );

  -- SPONSOR: leitura
  perform set_config('request.jwt.claim.sub', v_ctx.sponsor_user_id::text, true);
  select count(*) into v_rows
  from public.commitments
  where id = v_commitment_id;

  perform pg_temp.validation_record(
    'ROLE-SPONSOR-SELECT',
    'roles',
    v_rows = 1,
    'sponsor lê o compromisso',
    'row_count=' || v_rows,
    jsonb_build_object('actor_user_id', v_ctx.sponsor_user_id)
  );

  -- SPONSOR: cria decisão e vincula ao compromisso
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
    v_ctx.execution_id || ' sponsor linked decision',
    'Decisão temporária criada pelo sponsor durante a validação',
    'change',
    'approved',
    v_ctx.sponsor_user_id,
    now(),
    v_ctx.sponsor_user_id
  )
  returning id into v_decision_id;

  update public.commitments
  set origin_decision_id = v_decision_id
  where id = v_commitment_id;
  get diagnostics v_rows = row_count;

  perform pg_temp.validation_set_artifact('role_sponsor_decision', v_decision_id, jsonb_build_object('actor_user_id', v_ctx.sponsor_user_id));

  perform pg_temp.validation_record(
    'ROLE-SPONSOR-LINK-DECISION',
    'roles',
    v_decision_id is not null and v_rows = 1,
    'sponsor registra decisão vinculada quando permitido pelo modelo atual',
    'decision_id=' || coalesce(v_decision_id::text, 'null') || ', update_rows=' || v_rows,
    jsonb_build_object('decision_id', v_decision_id, 'commitment_id', v_commitment_id)
  );

  -- OBSERVER: leitura
  perform set_config('request.jwt.claim.sub', v_ctx.observer_user_id::text, true);
  select count(*) into v_rows
  from public.commitments
  where id = v_commitment_id;

  perform pg_temp.validation_record(
    'ROLE-OBSERVER-SELECT',
    'roles',
    v_rows = 1,
    'observer lê o compromisso',
    'row_count=' || v_rows,
    jsonb_build_object('actor_user_id', v_ctx.observer_user_id)
  );

  -- OBSERVER: update negado
  update public.commitments
  set description = v_ctx.execution_id || ' observer should not update'
  where id = v_commitment_id;
  get diagnostics v_rows = row_count;

  perform pg_temp.validation_record(
    'ROLE-OBSERVER-UPDATE-DENY',
    'roles',
    v_rows = 0,
    'observer não gerencia o compromisso',
    'row_count=' || v_rows,
    jsonb_build_object('actor_user_id', v_ctx.observer_user_id)
  );

  -- OBSERVER: insert de evidência negado
  begin
    insert into public.commitment_evidence (
      tenant_id,
      commitment_id,
      evidence_type,
      title,
      payload,
      is_final,
      submitted_by
    )
    values (
      v_ctx.primary_tenant_id,
      v_commitment_id,
      'note',
      v_ctx.execution_id || ' observer forbidden evidence',
      jsonb_build_object('source', 'negative_role_case', 'actor_role', 'observer'),
      false,
      v_ctx.observer_user_id
    );

    perform pg_temp.validation_record(
      'ROLE-OBSERVER-EVIDENCE-DENY',
      'roles',
      false,
      'observer não insere evidência',
      'insert executou sem erro',
      jsonb_build_object('actor_user_id', v_ctx.observer_user_id)
    );
  exception when others then
    perform pg_temp.validation_record(
      'ROLE-OBSERVER-EVIDENCE-DENY',
      'roles',
      true,
      'observer não insere evidência',
      sqlerrm,
      jsonb_build_object('actor_user_id', v_ctx.observer_user_id)
    );
  end;

  -- TEAM PARTICIPANT: leitura herdada
  perform set_config('request.jwt.claim.sub', v_ctx.team_participant_user_id::text, true);
  select count(*) into v_rows
  from public.commitments
  where id = v_commitment_id;

  perform pg_temp.validation_record(
    'ROLE-TEAM-PARTICIPANT-SELECT',
    'roles',
    v_rows = 1,
    'team participant lê o compromisso por pertencer ao primary_receiver_team_id',
    'row_count=' || v_rows,
    jsonb_build_object('actor_user_id', v_ctx.team_participant_user_id, 'receiver_team_id', v_ctx.receiver_team_id)
  );

  -- TEAM PARTICIPANT: comportamento real de gestão herdada
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
    'note',
    v_ctx.execution_id || ' team participant evidence',
    'Evidência criada por membro do time receiver para comprovar comportamento herdado',
    jsonb_build_object('source', 'role_case', 'actor_role', 'team_participant'),
    false,
    v_ctx.team_participant_user_id
  )
  returning id into v_evidence_id;

  perform pg_temp.validation_set_artifact('role_team_participant_evidence', v_evidence_id, jsonb_build_object('actor_user_id', v_ctx.team_participant_user_id));

  perform pg_temp.validation_record(
    'ROLE-TEAM-PARTICIPANT-MANAGE-OBSERVED',
    'roles',
    v_evidence_id is not null,
    'registrar o comportamento real de team participant na modelagem atual',
    'manage_granted_via_team_membership',
    jsonb_build_object(
      'actor_user_id', v_ctx.team_participant_user_id,
      'evidence_id', v_evidence_id,
      'interpretation', 'o modelo atual permite gestão herdada quando department_id = primary_receiver_team_id'
    )
  );

  -- TEAM PARTICIPANT: decisão continua bloqueada
  update public.commitment_decisions
  set title = v_ctx.execution_id || ' team participant should not update decision'
  where id = (select artifact_id from pg_temp.ontology_validation_artifacts where artifact_name = 'seed_decision');
  get diagnostics v_rows = row_count;

  perform pg_temp.validation_record(
    'ROLE-TEAM-PARTICIPANT-DECISION-DENY',
    'roles',
    v_rows = 0,
    'team participant não herda automaticamente gestão sobre decisão isolada',
    'row_count=' || v_rows,
    jsonb_build_object('decision_id', (select artifact_id from pg_temp.ontology_validation_artifacts where artifact_name = 'seed_decision'))
  );
end;
$$;

select *
from pg_temp.ontology_validation_results
where area = 'roles'
order by recorded_at, case_id;

commit;
