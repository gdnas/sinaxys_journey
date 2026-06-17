# Roteiro executável de validação operacional da ontologia

## Objetivo

Este pacote valida operacionalmente o domínio `commitments` com foco em:

1. RLS e permissões por papel operacional
2. isolamento multi-tenant
3. geração e leitura de eventos/timeline
4. consistência das views analíticas
5. checklist formal de aceite
6. decisão sobre iniciar ou não a UI read-only

A validação foi desenhada para usar **dados reais controlados**, com criação temporária de registros e **cleanup obrigatório**.

## Escopo validado

### Tabelas

- `commitments`
- `commitment_parties`
- `commitment_events`
- `commitment_decisions`
- `commitment_dependencies`
- `commitment_evidence`
- `commitment_execution_links`
- `commitment_review_cycles`
- `commitment_renegotiations`

### Views

- `v_commitment_analytics_overview`
- `v_commitment_overdue`
- `v_commitment_missing_evidence`
- `v_commitment_renegotiation_pressure`
- `v_commitment_decisions_without_execution`

### Funções / regras relevantes confirmadas

- `commitment_can_insert(p_tenant_id, p_created_by)`
- `commitment_can_view(p_commitment_id)`
- `commitment_can_manage(p_commitment_id)`
- `commitment_can_manage_decision(p_decision_id)`
- `commitment_log_event(...)`
- `commitment_canonical_event_type(...)`
- `commitment_normalize_event_payload(...)`
- `commitment_sync_primary_parties()`
- `commitment_validate_commitment_row()`
- `commitment_validate_party_row()`
- `commitment_validate_child_tenant()`
- `commitment_validate_decision_row()`

### Papéis semânticos confirmados

Papéis aceitos pelo domínio:

- canônicos: `owner`, `receiver`, `sponsor`, `approver`, `observer`
- compatíveis: `requester`, `reviewer`, `watcher`, `contributor`

Aliases importantes já existentes:

- `requester -> sponsor`
- `watcher -> observer`
- `reviewer -> approver`

## Observação importante sobre a localização dos SQLs

O pedido original sugeria gravar os blocos em `supabase/migrations/`, mas esse diretório está reservado para migrações geradas. Para manter o pacote seguro e ainda executável, os SQLs operacionais desta validação foram colocados em:

- `docs/ontology-validation/sql/`

Os nomes seguem o mesmo padrão temporal do plano para preservar rastreabilidade.

## Inventário do pacote

### Documentação

- `docs/ontology-operational-validation-runbook.md`
- `docs/ontology-approval-checklist.md`

### SQL executável

Execute na ordem abaixo, **na mesma sessão do SQL editor**, para preservar `pg_temp`:

1. `docs/ontology-validation/sql/20260617_ontology_validation_discovery_and_setup.sql`
2. `docs/ontology-validation/sql/20260617_ontology_validation_role_cases.sql`
3. `docs/ontology-validation/sql/20260617_ontology_validation_multitenant_cases.sql`
4. `docs/ontology-validation/sql/20260617_ontology_validation_event_timeline_cases.sql`
5. `docs/ontology-validation/sql/20260617_ontology_validation_analytics_cases.sql`
6. `docs/ontology-validation/sql/20260617_ontology_validation_cleanup.sql`

## Premissas operacionais

### 1. Mesma sessão

Os scripts criam tabelas e funções temporárias em `pg_temp`:

- `ontology_validation_context`
- `ontology_validation_artifacts`
- `ontology_validation_results`
- helpers `pg_temp.validation_*`

Se a sessão for trocada entre arquivos, o contexto será perdido.

### 2. Simulação real de RLS

Os casos usam o padrão já adotado no repositório para simular o usuário autenticado:

```sql
begin;
set local role authenticated;
select set_config('request.jwt.claim.sub', '<user-id>', true);
-- comandos sob RLS
commit;
```

### 3. Dados temporários com tag de execução

Todos os títulos, descrições e labels temporários usam prefixo:

- `__ONTOLOGY_VALIDATION__`

O `execution_id` também é persistido no contexto temporário.

### 4. Cleanup obrigatório

Nenhuma execução é considerada válida sem rodar o arquivo final de cleanup e confirmar resíduos zerados.

## Estratégia de contexto e seed

O setup faz quatro coisas:

1. encontra um `MASTERADMIN` real para cleanup; se não houver, o setup deve ser tratado como bloqueado;
2. escolhe automaticamente:

   - tenant primário elegível;
   - tenant secundário para testes de isolamento;
   - usuários reais controlados para `owner`, `receiver`, `sponsor`, `observer` e `team participant`;
   - um departamento real para `primary_receiver_team_id`;
3. cria artefatos base:
   - decisão temporária;
   - compromisso temporário;
   - parties base do compromisso;
4. inicializa a trilha de evidências.

## Interpretação operacional de `team participant`

O domínio não expõe `team participant` como valor canônico em `commitment_parties.role`.

Neste roteiro, o equivalente operacional validado é:

- usuário real pertencente ao `primary_receiver_team_id`
- **sem ser a party primária individual** do compromisso

O resultado final deve registrar explicitamente qual foi o comportamento observado:

- apenas leitura herdada
- ou gestão herdada

Se o comportamento observado for mais permissivo do que o esperado, isso deve virar **risco residual explícito**.

## Blocos e critérios por área

### A. Casos por papel

Cobertura mínima:

- `owner`
  - leitura
  - update do compromisso
  - inserção/remoção de party compatível
  - evento manual
  - evidência
- `receiver`
  - leitura
  - mutação permitida
  - tentativa indevida em decisão
- `sponsor`
  - leitura
  - criação de decisão vinculável
  - mutação do compromisso conforme modelo atual
- `observer`
  - leitura
  - falha em mutações
- `team participant`
  - leitura herdada por time
  - comprovação do limite operacional atual

### B. Casos multi-tenant

Cobertura mínima:

- leitura cruzada negada
- update cruzado negado
- inserção de evento cruzado negada
- mismatch de tenant em tabela filha bloqueado
- referência cruzada de decisão bloqueada
- isolamento nas views analíticas

### C. Eventos / timeline

Cobertura mínima:

- `owner_accepted`
- `receiver_accepted`
- `commitment_activated`
- `dependency_added` via alias legado
- `evidence_added` via alias legado
- `review_recorded` via alias legado
- `renegotiation_requested` via alias legado
- `health_changed` com payload normalizado
- ordenação cronológica
- rastreabilidade por `actor_user_id`, `causation_type`, `causation_id`
- leitura da timeline por ator autorizado e não autorizado

### D. Views analíticas

Cobertura mínima:

- consistência de contagens do overview
- overdue
- missing evidence
- renegotiation pressure
- decisions without execution
- isolamento por tenant no consumo

## Evidências geradas

Cada caso grava um registro em `pg_temp.ontology_validation_results` com:

- `case_id`
- `area`
- `success`
- `expectation`
- `actual`
- `details`
- `recorded_at`

Ao fim de cada arquivo, rode/exporte:

```sql
select *
from pg_temp.ontology_validation_results
order by recorded_at, case_id;
```

E também:

```sql
select *
from pg_temp.ontology_validation_artifacts
order by artifact_name;
```

## Critérios formais de aprovação

### APROVADA

Somente se todos os itens abaixo forem verdadeiros:

- 100% dos casos críticos de RLS passaram
- nenhum vazamento multi-tenant foi observado
- nenhuma mutação cruzada foi observada
- timeline ficou consistente e auditável
- analytics refletiram corretamente o estado material do conjunto de teste
- cleanup removeu integralmente os artefatos temporários

### APROVADA COM RISCO

Quando os casos críticos passam, mas ainda existe pelo menos um risco residual não bloqueante, por exemplo:

- ambiguidade do comportamento de `team participant`
- dependência de composição real de perfis do tenant
- necessidade de reforço documental sobre leitura de views

### REPROVADA

Quando ocorrer qualquer um dos itens abaixo:

- leitura cruzada entre tenants
- mutação cruzada entre tenants
- views analíticas expondo tenant indevido
- timeline inconsistente ou não rastreável
- falha relevante de RLS por papel
- cleanup deixando resíduos

## Regra de decisão sobre UI read-only

### Pode iniciar UI read-only

Somente se:

- RLS de leitura estiver comprovado
- views não vazarem tenant
- timeline estiver íntegra e auditável
- checklist executivo estiver verde ou apenas com riscos não bloqueantes

### Não iniciar UI read-only ainda

Se houver dúvida sobre:

- isolamento multi-tenant
- visibilidade real das views por usuário comum
- consistência temporal / causal da timeline
- semântica operacional do `team participant`

## Pós-execução

1. exportar a tabela de resultados temporários
2. preencher `docs/ontology-approval-checklist.md`
3. registrar decisão final:
   - `APROVADA`
   - `APROVADA COM RISCO`
   - `REPROVADA`
4. anexar evidências da execução
5. confirmar que o cleanup terminou com zero resíduos
