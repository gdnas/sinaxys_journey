-- Roteiro executável de validação operacional da ontologia
-- Bloco 6/6: cleanup obrigatório
-- Pré-requisito: setup executado na mesma sessão.

begin;
set local role authenticated;

select 1 from pg_temp.ontology_validation_context limit 1;
select 1 from pg_temp.ontology_validation_artifacts limit 1;

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

  select coalesce(array_agg(distinct artifact_id) filter (where artifact_name ilike '%commitment%'), array[]::uuid[])
    into v_commitment_ids
  from pg_temp.ontology_validation_artifacts
  where artifact_id is not null;

  select coalesce(array_agg(distinct artifact_id) filter (where artifact_name ilike '%decision%'), array[]::uuid[])
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
    'commitment_dependencies', (select count(*) from public.commitment_dependencies where commitment_id = any(v_commitment_ids)),
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
      'commitment_dependencies', 0,
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
where area = 'cleanup'
order by recorded_at, case_id;

select *
from pg_temp.ontology_validation_results
order by recorded_at, case_id;

select *
from pg_temp.ontology_validation_artifacts
order by artifact_name;

commit;
