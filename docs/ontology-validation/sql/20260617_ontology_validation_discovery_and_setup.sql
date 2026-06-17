-- Roteiro executável de validação operacional da ontologia
-- Bloco 1/6: discovery + setup
-- IMPORTANTE: execute este arquivo na mesma sessão dos próximos arquivos.

begin;
set local role authenticated;

create temp table if not exists ontology_validation_context (
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

create temp table if not exists ontology_validation_artifacts (
  artifact_name text primary key,
  artifact_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create temp table if not exists ontology_validation_results (
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
  insert into pg_temp.ontology_validation_results (case_id, area, success, expectation, actual, details)
  values (p_case_id, p_area, p_success, p_expectation, p_actual, coalesce(p_details, '{}'::jsonb));
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
  insert into pg_temp.ontology_validation_artifacts (artifact_name, artifact_id, metadata)
  values (p_artifact_name, p_artifact_id, coalesce(p_metadata, '{}'::jsonb))
  on conflict (artifact_name)
  do update set
    artifact_id = excluded.artifact_id,
    metadata = excluded.metadata,
    created_at = now();
end;
$$;

truncate table ontology_validation_artifacts;
truncate table ontology_validation_results;
truncate table ontology_validation_context;

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
  select ep.company_id, min(ep.id) as outsider_user_id
  from eligible_profiles ep
  where ep.company_id <> (select company_id from chosen_primary_tenant)
  group by ep.company_id
  order by count(*) desc, ep.company_id
  limit 1
)
insert into ontology_validation_context (
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
select
  concat('__ONTOLOGY_VALIDATION__-', to_char(clock_timestamp(), 'YYYYMMDD-HH24MISS')),
  (select id from masteradmin_candidate),
  (select id from masteradmin_candidate),
  (select company_id from chosen_primary_tenant),

  (select company_id from secondary_tenant),
  (select id from other_pool where rn = 1),
  (select id from receiver_team_pool where rn = 1),
  (select id from other_pool where rn = 2),
  (select id from other_pool where rn = 3),
  (select id from receiver_team_pool where rn = 2),
  (select department_id from chosen_team),
  (select outsider_user_id from secondary_tenant),
  jsonb_build_object(
    'selection_strategy', 'first eligible tenant with >=5 users and a department with >=2 non-admin members',
    'team_participant_interpretation', 'member of primary_receiver_team_id that is not the primary individual receiver'
  );

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
    jsonb_build_object('created_by', v_ctx.sponsor_user_id, 'tenant_id', v_ctx.primary_tenant_id)
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
    jsonb_build_object('created_by', v_ctx.owner_user_id, 'tenant_id', v_ctx.primary_tenant_id)
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

  perform pg_temp.validation_set_artifact('seed_party_owner', v_party_id, jsonb_build_object('role', 'owner'));

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

  perform pg_temp.validation_set_artifact('seed_party_receiver_team', v_party_id, jsonb_build_object('role', 'receiver', 'party_type', 'team'));

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

  perform pg_temp.validation_set_artifact('seed_party_receiver_user', v_party_id, jsonb_build_object('role', 'receiver', 'party_type', 'user'));

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

  perform pg_temp.validation_set_artifact('seed_party_sponsor', v_party_id, jsonb_build_object('role', 'sponsor'));

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

  perform pg_temp.validation_set_artifact('seed_party_observer', v_party_id, jsonb_build_object('role', 'observer'));

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

select *
from pg_temp.ontology_validation_context;

select *
from pg_temp.ontology_validation_artifacts
order by artifact_name;

select *
from pg_temp.ontology_validation_results
order by recorded_at, case_id;

commit;
