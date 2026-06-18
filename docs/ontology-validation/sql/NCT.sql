-- Roteiro executável de validação operacional da ontologia
-- Arquivo consolidado para execução em um único Run no Supabase SQL Editor

begin;

-- =========================================================
-- BLOCO 1/6 — discovery + setup
-- =========================================================

create temp table if not exists pg_temp.ontology_validation_context (
  execution_id text primary key,
  started_at timestamptz not null default now(),
  masteradmin_user_id uuid,
  cleanup_actor_user_id uuid,
  primary_tenant_id uuid not null,
  secondary_tenant_id uuid not null,
  owner_user_id uuid not null,
  receiver_user_id uuid not null,
  sponsor_user_id uuid not null,
  observer_user_id uuid not null,
  team_participant_user_id uuid not null,
  receiver_team_id uuid not null,
  outsider_user_id uuid not null,
  notes jsonb not null default '{}'::jsonb
);

create temp table if not exists pg_temp.ontology_validation_artifacts (
  artifact_name text primary key,
  artifact_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create temp table if not exists pg_temp.ontology_validation_results (
  case_id text not null,
  area text not null,
  success boolean not null,
  expectation text not null,
  actual text not null,
  details jsonb not null default '{}'::jsonb,
  recorded_at timestamptz not null default now()
);

create or replace function pg_temp.validation_record(
  p_case_id text,
  p_area text,
  p_success boolean,
  p_expectation text,
  p_actual text,
  p_details jsonb default '{}'::jsonb
)
returns void
language plpgsql
as $$
begin
  insert into pg_temp.ontology_validation_results (
    case_id,
    area,
    success,
    expectation,
    actual,
    details
  )
  values (
    p_case_id,
    p_area,
    p_success,
    p_expectation,
    p_actual,
    coalesce(p_details, '{}'::jsonb)
  );
end;
$$;

create or replace function pg_temp.validation_set_artifact(
  p_artifact_name text,
  p_artifact_id uuid,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
as $$
begin
  insert into pg_temp.ontology_validation_artifacts (
    artifact_name,
    artifact_id,
    metadata
  )
  values (
    p_artifact_name,
    p_artifact_id,
    coalesce(p_metadata, '{}'::jsonb)
  )
  on conflict (artifact_name)
  do update set
    artifact_id = excluded.artifact_id,
    metadata = excluded.metadata,
    created_at = now();
end;
$$;

grant select, insert, update, delete on table pg_temp.ontology_validation_context to authenticated;
grant select, insert, update, delete on table pg_temp.ontology_validation_artifacts to authenticated;
grant select, insert, update, delete on table pg_temp.ontology_validation_results to authenticated;
grant execute on function pg_temp.validation_record(text, text, boolean, text, text, jsonb) to authenticated;
grant execute on function pg_temp.validation_set_artifact(text, uuid, jsonb) to authenticated;

truncate table pg_temp.ontology_validation_artifacts;
truncate table pg_temp.ontology_validation_results;
truncate table pg_temp.ontology_validation_context;

do $$
declare
  v_masteradmin_user_id uuid;
  v_primary_tenant_id uuid;
  v_secondary_tenant_id uuid;
  v_owner_user_id uuid;
  v_receiver_user_id uuid;
  v_sponsor_user_id uuid;
  v_observer_user_id uuid;
  v_team_participant_user_id uuid;
  v_receiver_team_id uuid;
  v_outsider_user_id uuid;
begin
  with masteradmin_candidate as (
    select p.id
    from public.profiles p
    where p.active = true
      and p.role = 'MASTERADMIN'
    order by p.created_at, p.id
    limit 1
  ),
  eligible_profiles as (
    select
      p.id,
      p.company_id,
      p.department_id,
      p.role,
      p.name,
      case
        when p.role = 'COLABORADOR' then 0
        when p.role = 'HEAD' then 1
        when p.role = 'ADMIN' then 2
        else 9
      end as role_rank
    from public.profiles p
    where p.active = true
      and p.company_id is not null
      and p.role <> 'MASTERADMIN'
  ),
  team_candidates as (
    select
      ep.company_id,
      ep.department_id,
      count(*) as member_count
    from eligible_profiles ep
    where ep.department_id is not null
      and ep.role <> 'ADMIN'
    group by ep.company_id, ep.department_id
    having count(*) >= 2
  ),
  tenant_candidates as (
    select
      ep.company_id,
      count(distinct ep.id) as user_count,
      max(tc.member_count) as best_team_size
    from eligible_profiles ep
    join team_candidates tc
      on tc.company_id = ep.company_id
    group by ep.company_id
    having count(distinct ep.id) >= 5
  ),
  chosen_primary_tenant as (
    select tc.company_id
    from tenant_candidates tc
    order by tc.best_team_size desc, tc.user_count desc, tc.company_id
    limit 1
  ),
  chosen_team as (
    select tc.company_id, tc.department_id, tc.member_count
    from team_candidates tc
    join chosen_primary_tenant cpt
      on cpt.company_id = tc.company_id
    order by tc.member_count desc, tc.department_id
    limit 1
  ),
  receiver_team_pool as (
    select
      ep.id,
      ep.role,
      ep.role_rank,
      row_number() over (order by ep.role_rank, ep.id) as rn
    from eligible_profiles ep
    join chosen_team ct
      on ct.company_id = ep.company_id
     and ct.department_id = ep.department_id
    where ep.role <> 'ADMIN'
  ),
  other_pool as (
    select
      ep.id,
      ep.role,
      ep.role_rank,
      row_number() over (order by ep.role_rank, ep.id) as rn
    from eligible_profiles ep
    join chosen_primary_tenant cpt
      on cpt.company_id = ep.company_id
    where ep.id not in (select id from receiver_team_pool)
  ),
  secondary_tenant as (
    select
      ep.company_id,
      (array_agg(ep.id order by ep.id))[1] as outsider_user_id
    from eligible_profiles ep
    where ep.company_id <> (select company_id from chosen_primary_tenant)
    group by ep.company_id
    order by count(*) desc, ep.company_id
    limit 1
  )
  select
    (select id from masteradmin_candidate),
    (select company_id from chosen_primary_tenant),
    (select company_id from secondary_tenant),
    (select id from other_pool where rn = 1),
    (select id from receiver_team_pool where rn = 1),
    (select id from other_pool where rn = 2),
    (select id from other_pool where rn = 3),
    (select id from receiver_team_pool where rn = 2),
    (select department_id from chosen_team),
    (select outsider_user_id from secondary_tenant)
  into
    v_masteradmin_user_id,
    v_primary_tenant_id,
    v_secondary_tenant_id,
    v_owner_user_id,
    v_receiver_user_id,
    v_sponsor_user_id,
    v_observer_user_id,
    v_team_participant_user_id,
    v_receiver_team_id,
    v_outsider_user_id;

  if v_masteradmin_user_id is null then
    raise exception 'Nenhum MASTERADMIN ativo elegível encontrado.';
  end if;

  if v_primary_tenant_id is null then
    raise exception 'Nenhum tenant primário elegível encontrado (precisa >=5 usuários elegíveis e um department com >=2 não-admins).';
  end if;

  if v_secondary_tenant_id is null or v_outsider_user_id is null then
    raise exception 'Nenhum tenant secundário elegível encontrado.';
  end if;

  if v_receiver_team_id is null then
    raise exception 'Nenhum department elegível encontrado no tenant primário.';
  end if;

  if v_owner_user_id is null
     or v_receiver_user_id is null
     or v_sponsor_user_id is null
     or v_observer_user_id is null
     or v_team_participant_user_id is null then
    raise exception 'Não há usuários suficientes para preencher os papéis distintos exigidos pelo teste.';
  end if;

  insert into pg_temp.ontology_validation_context (
    execution_id,
    masteradmin_user_id,
    cleanup_actor_user_id,
    primary_tenant_id,
    secondary_tenant_id,
    owner_user_id,
    receiver_user_id,
    sponsor_user_id,
    observer_user_id,
    team_participant_user_id,
    receiver_team_id,
    outsider_user_id,
    notes
  )
  values (
    concat('__ONTOLOGY_VALIDATION__-', to_char(clock_timestamp(), 'YYYYMMDD-HH24MISS')),
    v_masteradmin_user_id,
    v_masteradmin_user_id,
    v_primary_tenant_id,
    v_secondary_tenant_id,
    v_owner_user_id,
    v_receiver_user_id,
    v_sponsor_user_id,
    v_observer_user_id,
    v_team_participant_user_id,
    v_receiver_team_id,
    v_outsider_user_id,
    jsonb_build_object(
      'selection_strategy', 'first eligible tenant with >=5 users and a department with >=2 non-admin members',
      'team_participant_interpretation', 'member of primary_receiver_team_id that is not the primary individual receiver'
    )
  );
end;
$$;

set local role authenticated;

do $$
declare
  v_ctx record;
  v_decision_id uuid;
  v_commitment_id uuid;
  v_party_id uuid;
begin
  select * into v_ctx from pg_temp.ontology_validation_context limit 1;

  if v_ctx.execution_id is null then
    raise exception 'Nenhum contexto elegível foi encontrado para a validação operacional.';
  end if;

  if v_ctx.masteradmin_user_id is null
     or v_ctx.cleanup_actor_user_id is null
     or v_ctx.primary_tenant_id is null
     or v_ctx.secondary_tenant_id is null
     or v_ctx.owner_user_id is null
     or v_ctx.receiver_user_id is null
     or v_ctx.sponsor_user_id is null
     or v_ctx.observer_user_id is null
     or v_ctx.team_participant_user_id is null
     or v_ctx.receiver_team_id is null
     or v_ctx.outsider_user_id is null then
    raise exception 'Contexto incompleto. Ajuste os perfis reais elegíveis antes de prosseguir.';
  end if;

  if v_ctx.owner_user_id in (v_ctx.receiver_user_id, v_ctx.sponsor_user_id, v_ctx.observer_user_id, v_ctx.team_participant_user_id)
     or v_ctx.receiver_user_id in (v_ctx.sponsor_user_id, v_ctx.observer_user_id, v_ctx.team_participant_user_id)
     or v_ctx.sponsor_user_id in (v_ctx.observer_user_id, v_ctx.team_participant_user_id)
     or v_ctx.observer_user_id = v_ctx.team_participant_user_id then
    raise exception 'Os perfis selecionados precisam ser distintos para a validação.';
  end if;

  perform pg_temp.validation_record(
    'SETUP-CONTEXT-READY',
    'setup',
    true,
    'contexto elegível encontrado',
    'contexto preenchido',
    jsonb_build_object(
      'execution_id', v_ctx.execution_id,
      'primary_tenant_id', v_ctx.primary_tenant_id,
      'secondary_tenant_id', v_ctx.secondary_tenant_id,
      'owner_user_id', v_ctx.owner_user_id,
      'receiver_user_id', v_ctx.receiver_user_id,
      'sponsor_user_id', v_ctx.sponsor_user_id,
      'observer_user_id', v_ctx.observer_user_id,
      'team_participant_user_id', v_ctx.team_participant_user_id,
      'receiver_team_id', v_ctx.receiver_team_id,
      'outsider_user_id', v_ctx.outsider_user_id,
      'cleanup_actor_user_id', v_ctx.cleanup_actor_user_id
    )
  );

  perform set_config('request.jwt.claim.sub', v_ctx.sponsor_user_id::text, true);

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
    v_ctx.execution_id || ' seed decision',
    v_ctx.execution_id || ' decisão temporária base para validação operacional',
    'create',
    'approved',
    v_ctx.sponsor_user_id,
    now(),
    v_ctx.sponsor_user_id
  )
  returning id into v_decision_id;

  perform pg_temp.validation_set_artifact(
    'seed_decision',
    v_decision_id,
    jsonb_build_object(
      'created_by', v_ctx.sponsor_user_id,
      'tenant_id', v_ctx.primary_tenant_id
    )
  );

  perform set_config('request.jwt.claim.sub', v_ctx.owner_user_id::text, true);

  insert into public.commitments (
    tenant_id,
    code,
    title,
    description,
    purpose,
    scope_summary,
    success_criteria,
    conditions_of_satisfaction,
    category,
    commitment_type,
    status,
    health,
    priority,
    acceptance_policy,
    evidence_required,
    review_cadence,
    strategic_context_type,
    origin_decision_id,
    primary_owner_user_id,
    primary_receiver_user_id,
    primary_receiver_team_id,
    start_date,
    due_date,
    created_by
  )
  values (
    v_ctx.primary_tenant_id,
    null,
    v_ctx.execution_id || ' seed commitment',
    v_ctx.execution_id || ' compromisso temporário para validar RLS, eventos e analytics',
    'Validar operacionalmente a ontologia de commitments com dados reais controlados',
    'Escopo temporário de validação sem UI',
    'Todos os casos críticos de RLS e analytics passam',
    'Nenhum vazamento multi-tenant e cleanup completo',
    'operational',
    'team_to_team',
    'negotiating',
    'unknown',
    'high',
    'bilateral',
    true,
    'weekly',
    'manual',
    v_decision_id,
    v_ctx.owner_user_id,
    null,
    v_ctx.receiver_team_id,
    now(),
    now() + interval '7 days',
    v_ctx.owner_user_id
  )
  returning id into v_commitment_id;

  perform pg_temp.validation_set_artifact(
    'seed_commitment',
    v_commitment_id,
    jsonb_build_object(
      'created_by', v_ctx.owner_user_id,
      'tenant_id', v_ctx.primary_tenant_id
    )
  );

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
    v_ctx.owner_user_id,
    'owner',
    true,
    true,
    true
  )
  returning id into v_party_id;

  perform pg_temp.validation_set_artifact(
    'seed_party_owner',
    v_party_id,
    jsonb_build_object('role', 'owner')
  );

  insert into public.commitment_parties (
    tenant_id,
    commitment_id,
    party_type,
    team_id,
    role,
    is_primary,
    acceptance_required,
    active
  )
  values (
    v_ctx.primary_tenant_id,
    v_commitment_id,
    'team',
    v_ctx.receiver_team_id,
    'receiver',
    true,
    true,
    true
  )
  returning id into v_party_id;

  perform pg_temp.validation_set_artifact(
    'seed_party_receiver_team',
    v_party_id,
    jsonb_build_object('role', 'receiver', 'party_type', 'team')
  );

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
    v_ctx.receiver_user_id,
    'receiver',
    false,
    true,
    true
  )
  returning id into v_party_id;

  perform pg_temp.validation_set_artifact(
    'seed_party_receiver_user',
    v_party_id,
    jsonb_build_object('role', 'receiver', 'party_type', 'user')
  );

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
    v_ctx.sponsor_user_id,
    'sponsor',
    false,
    false,
    true
  )
  returning id into v_party_id;

  perform pg_temp.validation_set_artifact(
    'seed_party_sponsor',
    v_party_id,
    jsonb_build_object('role', 'sponsor')
  );

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
    v_ctx.observer_user_id,
    'observer',
    false,
    false,
    true
  )
  returning id into v_party_id;

  perform pg_temp.validation_set_artifact(
    'seed_party_observer',
    v_party_id,
    jsonb_build_object('role', 'observer')
  );

  perform pg_temp.validation_record(
    'SETUP-SEED-COMMITMENT',
    'setup',
    true,
    'decisão, compromisso e parties base criados',
    'seed criado com sucesso',
    jsonb_build_object(
      'decision_id', v_decision_id,
      'commitment_id', v_commitment_id,
      'receiver_team_id', v_ctx.receiver_team_id
    )
  );
end;
$$;

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
  v_commitment_id := (
    select artifact_id
    from pg_temp.ontology_validation_artifacts
    where artifact_name = 'seed_commitment'
  );

  if v_commitment_id is null then
    raise exception 'Artefato seed_commitment não encontrado.';
  end if;

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

  v_event_id := public.commitment_log_event(
    v_commitment_id,
    'comment_added',
    jsonb_build_object('source', 'role_case', 'actor_role', 'owner'),
    'manual_validation',
    null,
    v_ctx.owner_user_id
  );

  perform pg_temp.validation_set_artifact(
    'role_owner_manual_event',
    v_event_id,
    jsonb_build_object('actor_user_id', v_ctx.owner_user_id)
  );

  perform pg_temp.validation_record(
    'ROLE-OWNER-EVENT',
    'roles',
    exists(
      select 1
      from public.commitment_events
      where id = v_event_id
        and actor_user_id = v_ctx.owner_user_id
    ),
    'owner cria evento manual',
    coalesce(v_event_id::text, 'null'),
    jsonb_build_object('event_id', v_event_id)
  );

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

  perform pg_temp.validation_set_artifact(
    'role_owner_evidence',
    v_evidence_id,
    jsonb_build_object('actor_user_id', v_ctx.owner_user_id)
  );

  perform pg_temp.validation_record(
    'ROLE-OWNER-EVIDENCE',
    'roles',
    v_evidence_id is not null,
    'owner adiciona evidência',
    coalesce(v_evidence_id::text, 'null'),
    jsonb_build_object('evidence_id', v_evidence_id)
  );

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

  perform pg_temp.validation_set_artifact(
    'role_receiver_evidence',
    v_evidence_id,
    jsonb_build_object('actor_user_id', v_ctx.receiver_user_id)
  );

  perform pg_temp.validation_record(
    'ROLE-RECEIVER-EVIDENCE',
    'roles',
    v_evidence_id is not null,
    'receiver cria evidência quando commitment_can_manage = true',
    coalesce(v_evidence_id::text, 'null'),
    jsonb_build_object('evidence_id', v_evidence_id)
  );

  update public.commitment_decisions
  set title = v_ctx.execution_id || ' receiver should not update decision'
  where id = (
    select artifact_id
    from pg_temp.ontology_validation_artifacts
    where artifact_name = 'seed_decision'
  );
  get diagnostics v_rows = row_count;

  perform pg_temp.validation_record(
    'ROLE-RECEIVER-DECISION-DENY',
    'roles',
    v_rows = 0,
    'receiver não atualiza decisão que não gerencia',
    'row_count=' || v_rows,
    jsonb_build_object(
      'decision_id',
      (
        select artifact_id
        from pg_temp.ontology_validation_artifacts
        where artifact_name = 'seed_decision'
      )
    )
  );

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

  perform pg_temp.validation_set_artifact(
    'role_sponsor_decision',
    v_decision_id,
    jsonb_build_object('actor_user_id', v_ctx.sponsor_user_id)
  );

  perform pg_temp.validation_record(
    'ROLE-SPONSOR-LINK-DECISION',
    'roles',
    v_decision_id is not null and v_rows = 1,
    'sponsor registra decisão vinculada quando permitido pelo modelo atual',
    'decision_id=' || coalesce(v_decision_id::text, 'null') || ', update_rows=' || v_rows,
    jsonb_build_object('decision_id', v_decision_id, 'commitment_id', v_commitment_id)
  );

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
    jsonb_build_object(
      'actor_user_id', v_ctx.team_participant_user_id,
      'receiver_team_id', v_ctx.receiver_team_id
    )
  );

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

  perform pg_temp.validation_set_artifact(
    'role_team_participant_evidence',
    v_evidence_id,
    jsonb_build_object('actor_user_id', v_ctx.team_participant_user_id)
  );

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

  update public.commitment_decisions
  set title = v_ctx.execution_id || ' team participant should not update decision'
  where id = (
    select artifact_id
    from pg_temp.ontology_validation_artifacts
    where artifact_name = 'seed_decision'
  );
  get diagnostics v_rows = row_count;

  perform pg_temp.validation_record(
    'ROLE-TEAM-PARTICIPANT-DECISION-DENY',
    'roles',
    v_rows = 0,
    'team participant não herda automaticamente gestão sobre decisão isolada',
    'row_count=' || v_rows,
    jsonb_build_object(
      'decision_id',
      (
        select artifact_id
        from pg_temp.ontology_validation_artifacts
        where artifact_name = 'seed_decision'
      )
    )
  );
end;
$$;

do $$
declare
  v_ctx record;
  v_commitment_id uuid;
  v_seed_decision_id uuid;
  v_foreign_decision_id uuid;
  v_rows integer;
  v_cross_commitment_id uuid;
begin
  select * into v_ctx from pg_temp.ontology_validation_context limit 1;
  v_commitment_id := (
    select artifact_id
    from pg_temp.ontology_validation_artifacts
    where artifact_name = 'seed_commitment'
  );
  v_seed_decision_id := (
    select artifact_id
    from pg_temp.ontology_validation_artifacts
    where artifact_name = 'seed_decision'
  );

  if v_commitment_id is null then
    raise exception 'Artefato seed_commitment não encontrado.';
  end if;

  perform set_config('request.jwt.claim.sub', v_ctx.outsider_user_id::text, true);
  select count(*) into v_rows
  from public.commitments
  where id = v_commitment_id;

  perform pg_temp.validation_record(
    'MT-CROSS-TENANT-READ-DENY',
    'multi-tenant',
    v_rows = 0,
    'usuário de tenant externo não lê compromisso do tenant primário',
    'row_count=' || v_rows,
    jsonb_build_object('outsider_user_id', v_ctx.outsider_user_id, 'commitment_id', v_commitment_id)
  );

  update public.commitments
  set title = v_ctx.execution_id || ' outsider should not update'
  where id = v_commitment_id;
  get diagnostics v_rows = row_count;

  perform pg_temp.validation_record(
    'MT-CROSS-TENANT-UPDATE-DENY',
    'multi-tenant',
    v_rows = 0,
    'usuário de tenant externo não atualiza compromisso do tenant primário',
    'row_count=' || v_rows,
    jsonb_build_object('outsider_user_id', v_ctx.outsider_user_id)
  );

  begin
    perform public.commitment_log_event(
      v_commitment_id,
      'comment_added',
      jsonb_build_object('source', 'multi_tenant_negative_case'),
      'manual_validation',
      null,
      v_ctx.outsider_user_id
    );

    perform pg_temp.validation_record(
      'MT-CROSS-TENANT-EVENT-DENY',
      'multi-tenant',
      false,
      'usuário de tenant externo não registra evento em compromisso alheio',
      'RPC executou sem erro',
      jsonb_build_object('outsider_user_id', v_ctx.outsider_user_id)
    );
  exception when others then
    perform pg_temp.validation_record(
      'MT-CROSS-TENANT-EVENT-DENY',
      'multi-tenant',
      true,
      'usuário de tenant externo não registra evento em compromisso alheio',
      sqlerrm,
      jsonb_build_object('outsider_user_id', v_ctx.outsider_user_id)
    );
  end;

  perform set_config('request.jwt.claim.sub', v_ctx.owner_user_id::text, true);
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
      v_ctx.secondary_tenant_id,
      v_commitment_id,
      'note',
      v_ctx.execution_id || ' tenant mismatch evidence',
      jsonb_build_object('source', 'multi_tenant_negative_case'),
      false,
      v_ctx.owner_user_id
    );

    perform pg_temp.validation_record(
      'MT-CHILD-TENANT-MISMATCH-DENY',
      'multi-tenant',
      false,
      'tabela filha rejeita tenant diferente do compromisso',
      'insert executou sem erro',
      jsonb_build_object('commitment_id', v_commitment_id)
    );
  exception when others then
    perform pg_temp.validation_record(
      'MT-CHILD-TENANT-MISMATCH-DENY',
      'multi-tenant',
      true,
      'tabela filha rejeita tenant diferente do compromisso',
      sqlerrm,
      jsonb_build_object('commitment_id', v_commitment_id)
    );
  end;

  perform set_config('request.jwt.claim.sub', v_ctx.outsider_user_id::text, true);
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
    v_ctx.secondary_tenant_id,
    v_ctx.execution_id || ' foreign decision',
    'Decisão temporária criada no tenant secundário para teste de referência cruzada',
    'create',
    'approved',
    v_ctx.outsider_user_id,
    now(),
    v_ctx.outsider_user_id
  )
  returning id into v_foreign_decision_id;

  perform pg_temp.validation_set_artifact(
    'mt_foreign_decision',
    v_foreign_decision_id,
    jsonb_build_object(
      'tenant_id', v_ctx.secondary_tenant_id,
      'actor_user_id', v_ctx.outsider_user_id
    )
  );

  perform set_config('request.jwt.claim.sub', v_ctx.owner_user_id::text, true);
  begin
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
      created_by
    )
    values (
      v_ctx.primary_tenant_id,
      null,
      v_ctx.execution_id || ' cross tenant commitment',
      'Este insert deve falhar por referência cruzada de decisão',
      'Validar bloqueio cross-tenant',
      'operational',
      'bilateral',
      'proposed',
      'unknown',
      'medium',
      'none',
      false,
      'manual',
      v_foreign_decision_id,
      v_ctx.owner_user_id,
      v_ctx.receiver_user_id,
      null,
      v_ctx.owner_user_id
    )
    returning id into v_cross_commitment_id;

    perform pg_temp.validation_set_artifact(
      'mt_unexpected_cross_commitment',
      v_cross_commitment_id,
      jsonb_build_object('should_exist', false)
    );

    perform pg_temp.validation_record(
      'MT-CROSS-TENANT-DECISION-REFERENCE-DENY',
      'multi-tenant',
      false,
      'commitment não aceita origin_decision_id de outro tenant',
      'insert executou sem erro',
      jsonb_build_object(
        'foreign_decision_id', v_foreign_decision_id,
        'unexpected_commitment_id', v_cross_commitment_id
      )
    );
  exception when others then
    perform pg_temp.validation_record(
      'MT-CROSS-TENANT-DECISION-REFERENCE-DENY',
      'multi-tenant',
      true,
      'commitment não aceita origin_decision_id de outro tenant',
      sqlerrm,
      jsonb_build_object('foreign_decision_id', v_foreign_decision_id)
    );
  end;

  perform set_config('request.jwt.claim.sub', v_ctx.outsider_user_id::text, true);
  select count(*) into v_rows
  from public.v_commitment_analytics_overview
  where commitment_id = v_commitment_id
    and tenant_id = v_ctx.primary_tenant_id;

  perform pg_temp.validation_record(
    'MT-ANALYTICS-OVERVIEW-ISOLATION',
    'multi-tenant',
    v_rows = 0,
    'view overview não retorna linha do tenant primário para usuário externo',
    'row_count=' || v_rows,
    jsonb_build_object('outsider_user_id', v_ctx.outsider_user_id)
  );

  select count(*) into v_rows
  from public.v_commitment_decisions_without_execution
  where decision_id = v_seed_decision_id
    and tenant_id = v_ctx.primary_tenant_id;

  perform pg_temp.validation_record(
    'MT-ANALYTICS-DECISIONS-ISOLATION',
    'multi-tenant',
    v_rows = 0,
    'view decisions_without_execution não retorna linha do tenant primário para usuário externo',
    'row_count=' || v_rows,
    jsonb_build_object(
      'outsider_user_id', v_ctx.outsider_user_id,
      'decision_id', v_seed_decision_id
    )
  );
end;
$$;

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
  v_commitment_id := (
    select artifact_id
    from pg_temp.ontology_validation_artifacts
    where artifact_name = 'seed_commitment'
  );

  if v_commitment_id is null then
    raise exception 'Artefato seed_commitment não encontrado.';
  end if;

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

  perform pg_temp.validation_set_artifact(
    'event_owner_accepted',
    v_event_id,
    jsonb_build_object('actor_user_id', v_ctx.owner_user_id)
  );

  perform pg_temp.validation_record(
    'EVT-OWNER-ACCEPTED',
    'events',
    exists(
      select 1
      from public.commitment_events
      where id = v_event_id
        and event_type = 'owner_accepted'
    ),
    'evento owner_accepted registrado',
    coalesce(v_event_id::text, 'null'),
    jsonb_build_object('event_id', v_event_id)
  );

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

  perform pg_temp.validation_set_artifact(
    'event_receiver_accepted',
    v_event_id,
    jsonb_build_object('actor_user_id', v_ctx.receiver_user_id)
  );

  perform pg_temp.validation_record(
    'EVT-RECEIVER-ACCEPTED',
    'events',
    exists(
      select 1
      from public.commitment_events
      where id = v_event_id
        and event_type = 'receiver_accepted'
    ),
    'evento receiver_accepted registrado',
    coalesce(v_event_id::text, 'null'),
    jsonb_build_object('event_id', v_event_id)
  );

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

  perform pg_temp.validation_set_artifact(
    'event_commitment_activated',
    v_event_id,
    jsonb_build_object('actor_user_id', v_ctx.owner_user_id)
  );

  perform pg_temp.validation_record(
    'EVT-COMMITMENT-ACTIVATED',
    'events',
    exists(
      select 1
      from public.commitments
      where id = v_commitment_id
        and status = 'active'
        and activated_at is not null
    )
    and exists(
      select 1
      from public.commitment_events
      where id = v_event_id
        and event_type = 'commitment_activated'
    ),
    'compromisso ativo e evento de ativação registrados',
    coalesce(v_event_id::text, 'null'),
    jsonb_build_object('event_id', v_event_id)
  );

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

  perform pg_temp.validation_set_artifact(
    'event_dependency',
    v_dependency_id,
    jsonb_build_object('actor_user_id', v_ctx.owner_user_id)
  );

  v_event_id := public.commitment_log_event(
    v_commitment_id,
    'dependency_created',
    jsonb_build_object('dependency_id', v_dependency_id),
    'dependency',
    v_dependency_id,
    v_ctx.owner_user_id
  );

  perform pg_temp.validation_set_artifact(
    'event_dependency_added',
    v_event_id,
    jsonb_build_object('actor_user_id', v_ctx.owner_user_id)
  );

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

  perform pg_temp.validation_set_artifact(
    'event_evidence',
    v_evidence_id,
    jsonb_build_object('actor_user_id', v_ctx.receiver_user_id)
  );

  v_event_id := public.commitment_log_event(
    v_commitment_id,
    'evidence_attached',
    jsonb_build_object('evidence_id', v_evidence_id),
    'evidence',
    v_evidence_id,
    v_ctx.receiver_user_id
  );

  perform pg_temp.validation_set_artifact(
    'event_evidence_added',
    v_event_id,
    jsonb_build_object('actor_user_id', v_ctx.receiver_user_id)
  );

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

  perform pg_temp.validation_set_artifact(
    'event_review_cycle',
    v_review_id,
    jsonb_build_object('actor_user_id', v_ctx.sponsor_user_id)
  );

  v_event_id := public.commitment_log_event(
    v_commitment_id,
    'review_cycle_created',
    jsonb_build_object('review_cycle_id', v_review_id),
    'review_cycle',
    v_review_id,
    v_ctx.sponsor_user_id
  );

  perform pg_temp.validation_set_artifact(
    'event_review_recorded',
    v_event_id,
    jsonb_build_object('actor_user_id', v_ctx.sponsor_user_id)
  );

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
    jsonb_build_object(
      'due_date',
      (select due_date from public.commitments where id = v_commitment_id)
    ),
    jsonb_build_object('due_date', now() + interval '14 days'),
    'Renegociação temporária para validar timeline',
    v_ctx.receiver_user_id
  )
  returning id into v_renegotiation_id;

  perform pg_temp.validation_set_artifact(
    'event_renegotiation_open',
    v_renegotiation_id,
    jsonb_build_object('actor_user_id', v_ctx.receiver_user_id)
  );

  v_event_id := public.commitment_log_event(
    v_commitment_id,
    'renegotiation_opened',
    jsonb_build_object('renegotiation_id', v_renegotiation_id),
    'renegotiation',
    v_renegotiation_id,
    v_ctx.receiver_user_id
  );

  perform pg_temp.validation_set_artifact(
    'event_renegotiation_requested',
    v_event_id,
    jsonb_build_object('actor_user_id', v_ctx.receiver_user_id)
  );

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

  perform set_config('request.jwt.claim.sub', v_ctx.owner_user_id::text, true);
  v_event_id := public.commitment_log_event(
    v_commitment_id,
    'health_changed_to_overdue',
    jsonb_build_object('previous_health', 'healthy'),
    'manual_validation',
    null,
    v_ctx.owner_user_id
  );

  perform pg_temp.validation_set_artifact(
    'event_health_changed',
    v_event_id,
    jsonb_build_object('actor_user_id', v_ctx.owner_user_id)
  );

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

  perform set_config('request.jwt.claim.sub', v_ctx.observer_user_id::text, true);
  with ordered as (
    select
      created_at,
      lag(created_at) over (order by created_at, id) as prev_created_at
    from public.commitment_events
    where commitment_id = v_commitment_id
  )
  select coalesce(
    bool_and(prev_created_at is null or created_at >= prev_created_at),
    true
  )
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
  v_commitment_id := (
    select artifact_id
    from pg_temp.ontology_validation_artifacts
    where artifact_name = 'seed_commitment'
  );

  if v_commitment_id is null then
    raise exception 'Artefato seed_commitment não encontrado.';
  end if;

  perform set_config('request.jwt.claim.sub', v_ctx.owner_user_id::text, true);

  update public.commitments
  set due_date = now() - interval '2 days',
      health = 'overdue'
  where id = v_commitment_id;

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

  perform pg_temp.validation_set_artifact(
    'analytics_missing_decision',
    v_missing_decision_id,
    jsonb_build_object('actor_user_id', v_ctx.owner_user_id)
  );

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

  perform pg_temp.validation_set_artifact(
    'analytics_missing_commitment',
    v_missing_commitment_id,
    jsonb_build_object('actor_user_id', v_ctx.owner_user_id)
  );

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

do $$
declare
  v_ctx record;
  v_cleanup_actor uuid;
  v_commitment_ids uuid[];
  v_decision_ids uuid[];
  v_deleted bigint;
  v_residuals jsonb;
begin
  select * into v_ctx from pg_temp.ontology_validation_context limit 1;
  v_cleanup_actor := v_ctx.cleanup_actor_user_id;

  if v_cleanup_actor is null then
    raise exception 'cleanup_actor_user_id não encontrado no contexto temporário.';
  end if;

  select coalesce(
    array_agg(distinct artifact_id) filter (where artifact_name ilike '%commitment%'),
    array[]::uuid[]
  )
  into v_commitment_ids
  from pg_temp.ontology_validation_artifacts
  where artifact_id is not null;

  select coalesce(
    array_agg(distinct artifact_id) filter (where artifact_name ilike '%decision%'),
    array[]::uuid[]
  )
  into v_decision_ids
  from pg_temp.ontology_validation_artifacts
  where artifact_id is not null;

  perform set_config('request.jwt.claim.sub', v_cleanup_actor::text, true);

  delete from public.commitment_comments
  where commitment_id = any(v_commitment_ids);

  delete from public.commitment_review_cycles
  where commitment_id = any(v_commitment_ids);

  delete from public.commitment_execution_links
  where commitment_id = any(v_commitment_ids);

  delete from public.commitment_evidence
  where commitment_id = any(v_commitment_ids);

  delete from public.commitment_dependencies
  where commitment_id = any(v_commitment_ids);

  delete from public.commitment_renegotiations
  where commitment_id = any(v_commitment_ids);

  delete from public.commitment_events
  where commitment_id = any(v_commitment_ids);

  delete from public.commitment_parties
  where commitment_id = any(v_commitment_ids);

  delete from public.commitments
  where id = any(v_commitment_ids);
  get diagnostics v_deleted = row_count;

  delete from public.commitment_decisions
  where id = any(v_decision_ids);

  perform pg_temp.validation_record(
    'CLEANUP-DELETE-ARTIFACTS',
    'cleanup',
    true,
    'artefatos temporários são removidos na ordem correta',
    'commitment_rows_deleted=' || coalesce(v_deleted, 0),
    jsonb_build_object(
      'cleanup_actor_user_id', v_cleanup_actor,
      'commitment_ids', v_commitment_ids,
      'decision_ids', v_decision_ids
    )
  );

  select jsonb_build_object(
    'commitments', (select count(*) from public.commitments where id = any(v_commitment_ids)),
    'commitment_parties', (select count(*) from public.commitment_parties where commitment_id = any(v_commitment_ids)),
    'commitment_events', (select count(*) from public.commitment_events where commitment_id = any(v_commitment_ids)),
    'commitmentDependencies', (select count(*) from public.commitment_dependencies where commitment_id = any(v_commitment_ids)),
    'commitment_evidence', (select count(*) from public.commitment_evidence where commitment_id = any(v_commitment_ids)),
    'commitment_execution_links', (select count(*) from public.commitment_execution_links where commitment_id = any(v_commitment_ids)),
    'commitment_review_cycles', (select count(*) from public.commitment_review_cycles where commitment_id = any(v_commitment_ids)),
    'commitment_renegotiations', (select count(*) from public.commitment_renegotiations where commitment_id = any(v_commitment_ids)),
    'commitment_comments', (select count(*) from public.commitment_comments where commitment_id = any(v_commitment_ids)),
    'commitment_decisions', (select count(*) from public.commitment_decisions where id = any(v_decision_ids))
  ) into v_residuals;

  perform pg_temp.validation_record(
    'CLEANUP-RESIDUALS-ZERO',
    'cleanup',
    v_residuals = jsonb_build_object(
      'commitments', 0,
      'commitment_parties', 0,
      'commitment_events', 0,
      'commitmentDependencies', 0,
      'commitment_evidence', 0,
      'commitment_execution_links', 0,
      'commitment_review_cycles', 0,
      'commitment_renegotiations', 0,
      'commitment_comments', 0,
      'commitment_decisions', 0
    ),
    'nenhum resíduo operacional permanece após o cleanup',
    v_residuals::text,
    v_residuals
  );
end;
$$;

select *
from pg_temp.ontology_validation_results
order by recorded_at, case_id;

select *
from pg_temp.ontology_validation_artifacts
order by artifact_name;

commit;