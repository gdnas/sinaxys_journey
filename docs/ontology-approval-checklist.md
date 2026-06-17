# Checklist executivo de aprovação da ontologia

> Preencher após a execução integral do pacote SQL na mesma sessão.

## Identificação da execução

- Data/hora:
- Operador:
- `execution_id`:
- Tenant primário:
- Tenant secundário:

## Resultado por bloco

| Bloco | Status | Evidência principal | Observações |
| --- | --- | --- | --- |
| Discovery e setup | ☐ verde / ☐ amarelo / ☐ vermelho |  |  |
| Casos por papel | ☐ verde / ☐ amarelo / ☐ vermelho |  |  |
| Casos multi-tenant | ☐ verde / ☐ amarelo / ☐ vermelho |  |  |
| Eventos / timeline | ☐ verde / ☐ amarelo / ☐ vermelho |  |  |
| Views analíticas | ☐ verde / ☐ amarelo / ☐ vermelho |  |  |
| Cleanup | ☐ verde / ☐ amarelo / ☐ vermelho |  |  |

## Critérios críticos de segurança

### RLS por papel

- [ ] `owner` consegue ler e gerir o compromisso conforme esperado
- [ ] `receiver` consegue ler e gerir apenas o que o modelo atual autoriza
- [ ] `sponsor` apresenta comportamento coerente com o modelo atual
- [ ] `observer` lê, mas não gerencia
- [ ] `team participant` teve comportamento observado e registrado explicitamente

### Isolamento multi-tenant

- [ ] usuário do tenant B não leu compromisso do tenant A
- [ ] usuário do tenant B não atualizou compromisso do tenant A
- [ ] usuário do tenant B não inseriu evento no compromisso do tenant A
- [ ] referências cruzadas entre tenants foram bloqueadas
- [ ] views analíticas não retornaram linhas indevidas para tenant externo

### Timeline e eventos

- [ ] eventos essenciais foram gerados
- [ ] aliases legados foram canonizados corretamente
- [ ] payload de health foi normalizado corretamente
- [ ] `actor_user_id` ficou coerente
- [ ] `causation_type` / `causation_id` ficaram coerentes
- [ ] ordem cronológica ficou consistente
- [ ] timeline respeitou RLS de leitura

### Analytics

- [ ] `v_commitment_analytics_overview` bate com as tabelas-base
- [ ] `v_commitment_overdue` refletiu o estado esperado
- [ ] `v_commitment_missing_evidence` refletiu o estado esperado
- [ ] `v_commitment_renegotiation_pressure` refletiu o estado esperado
- [ ] `v_commitment_decisions_without_execution` refletiu o estado esperado

### Cleanup

- [ ] todos os artefatos temporários foram removidos
- [ ] não sobraram resíduos nas tabelas filhas
- [ ] não sobraram resíduos em `commitments`
- [ ] não sobraram resíduos em `commitment_decisions`

## Riscos residuais

Marque os riscos observados e detalhe abaixo:

- [ ] ambiguidade operacional de `team participant`
- [ ] dependência forte de composição real de perfis/tenant
- [ ] necessidade de reforçar proteção de leitura das views
- [ ] necessidade de revisão adicional da timeline/event ledger
- [ ] outro risco residual

### Detalhamento dos riscos residuais

- 
- 
- 

## Decisão final

### Classificação

- [ ] APROVADA
- [ ] APROVADA COM RISCO
- [ ] REPROVADA

### Justificativa objetiva

- 
- 
- 

## Decisão sobre iniciar UI read-only de inspeção

- [ ] AUTORIZAR
- [ ] NÃO AUTORIZAR AINDA

### Justificativa

- 
- 
- 

## Registro final

- Responsável pela decisão:
- Data/hora da decisão:
- Link/local das evidências arquivadas:
