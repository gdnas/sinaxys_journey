-- Roteiro executável de validação operacional da ontologia
-- Bloco 3/6: casos multi-tenant
-- Pré-requisito: setup executado na mesma sessão.

begin;
set local role authenticated;

select 1 from pg_temp.ontology_validation_context limit 1;
select 1 from pg_temp.ontology_validation_artifacts limit 1;

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
  v_commitment_id := (select artifact_id from pg_temp.ontology_validation_artifacts where artifact_name = 'seed_commitment');
  v_seed_decision_id := (select artifact_id from pg_temp.ontology_validation_artifacts where artifact_name = 'seed_decision');

  if v_commitment_id is null then
    raise exception 'Artefato seed_commitment não encontrado.';
  end if;

  -- Tenant B não lê compromisso do tenant A
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

  -- Tenant B não atualiza compromisso do tenant A
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

  -- Tenant B não registra evento no compromisso do tenant A
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

  -- mismatch de tenant em tabela filha é bloqueado
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

  -- Criar decisão real no tenant B
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

  perform pg_temp.validation_set_artifact('mt_foreign_decision', v_foreign_decision_id, jsonb_build_object('tenant_id', v_ctx.secondary_tenant_id, 'actor_user_id', v_ctx.outsider_user_id));

  -- Owner do tenant A não consegue referenciar decisão do tenant B
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

    perform pg_temp.validation_set_artifact('mt_unexpected_cross_commitment', v_cross_commitment_id, jsonb_build_object('should_exist', false));

    perform pg_temp.validation_record(
      'MT-CROSS-TENANT-DECISION-REFERENCE-DENY',
      'multi-tenant',
      false,
      'commitment não aceita origin_decision_id de outro tenant',
      'insert executou sem erro',
      jsonb_build_object('foreign_decision_id', v_foreign_decision_id, 'unexpected_commitment_id', v_cross_commitment_id)
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

  -- Views analíticas não vazam para tenant externo
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
    jsonb_build_object('outsider_user_id', v_ctx.outsider_user_id, 'decision_id', v_seed_decision_id)
  );
end;
$$;

select *
from pg_temp.ontology_validation_results
where area = 'multi-tenant'
order by recorded_at, case_id;

commit;
