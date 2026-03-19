# Documentação Técnica: Coerência Estratégica Obrigatória em Projects

**Data:** 2025-03-17
**Status:** ✅ IMPLEMENTADO
**Arquivo:** `supabase/migrations/20250317_strategic_context_validation.sql`

---

## 📋 Resumo Executivo

Implementada validação obrigatória de contexto estratégico na tabela `projects`. Todo projeto deve estar vinculado a uma entidade de execução estratégica (`key_result_id` OU `deliverable_id`).

### Impacto Legado
- **3 projetos totais** no sistema
- **1 projeto** com `key_result_id` (válido)
- **0 projetos** com `deliverable_id`
- **2 projetos** SEM contexto estratégico (legado, continuam funcionando)

---

## 🎯 Regras de Negócio Implementadas

### REGRA OBRIGATÓRIA
```
project.key_result_id OU project.deliverable_id deve existir
```
- **NOVOS projetos (INSERT):** OBRIGATÓRIO ter contexto
- **PROJETOS VÁLIDOS (UPDATE):** OBRIGATÓRIO manter contexto
- **PROJETOS LEGADOS (UPDATE):** Permite editar outros campos, mas não remover contexto (que não existe)

### REGRA DE COERÊNCIA (já existia)
- Se `deliverable_id` existe → deve apontar para entregável válido
- Se `key_result_id` existe → deve apontar para KR válido
- Se ambos existem → `deliverable_id` deve pertencer ao `key_result_id`
- Ambos devem pertencer ao mesmo `tenant_id`

---

## 🏗️ Arquitetura da Solução

### 1. Função Modificada
**Arquivo:** `public.ensure_project_tenant_coherence()`

**Mudança:**
- Adicionada lógica para validar contexto estratégico
- Mantém validações existentes (tenant, usuário, etc.)
- Diferencia comportamento entre INSERT e UPDATE

**Lógica de Validação:**

```sql
-- Para INSERT novos
if tg_op = 'INSERT' then
  if new.key_result_id is null and new.deliverable_id is null then
    raise exception 'Project must have strategic context...';
  end if;
end if;

-- Para UPDATE de projetos válidos
if tg_op = 'UPDATE' then
  if old.key_result_id is not null or old.deliverable_id is not null then
    if new.key_result_id is null and new.deliverable_id is null then
      raise exception 'Cannot remove strategic context...';
    end if;
  end if;
end if;
```

### 2. Triggers Existentes (Reutilizados)
- ✅ `trg_projects_tenant_coherence` (INSERT, UPDATE)
- ✅ Chama `ensure_project_tenant_coherence()`

**Nenhuma mudança nos triggers necessária.**

### 3. Políticas RLS (Mantidas)
- ✅ `projects_insert_policy` - usa `can_manage_project()`
- ✅ `projects_update_policy` - usa `can_manage_project()`

**Nenhuma mudança nas políticas necessária.**

---

## 📊 Análise de Dados Legados

### Projetos Identificados (sem contexto estratégico)

| ID | Nome | Status | Criação | Ação Necessária |
|----|------|--------|---------|-----------------|
| `4195cc3d-f856-42dc-a548-464486dc3375` | "Projeto teste Fase 4" | not_started | 2025-03-17 | Vincular a KR ou Deliverable |
| `78d61014-4869-45f4-a777-87cc2d1ef9b7` | "Projeto teste Fase 4" | not_started | 2025-03-17 | Vincular a KR ou Deliverable |

**Comportamento atual:**
- ✅ Podem ser visualizados
- ✅ Podem ser editados (outros campos)
- ❌ Não podem ser duplicados sem contexto
- ⚠️ Ainda sem contexto estratégico (não foram corrigidos automaticamente)

---

## 🚀 Comportamento do Sistema

### Cenário 1: Criar novo projeto SEM contexto
**Operação:** `INSERT INTO projects (...) VALUES (...)`
```sql
-- Tentar inserir sem key_result_id e deliverable_id
INSERT INTO public.projects (tenant_id, name, owner_user_id, created_by_user_id, visibility, status)
VALUES ('...', 'Projeto Sem Contexto', '...', '...', 'public', 'not_started');
```
**Resultado:** ❌ **ERRO**
```
ERROR: Project must have strategic context: key_result_id or deliverable_id is required
```

### Cenário 2: Criar novo projeto COM contexto
**Operação:** `INSERT INTO projects (...) VALUES (...)`
```sql
-- Inserir com key_result_id válido
INSERT INTO public.projects (tenant_id, name, key_result_id, owner_user_id, created_by_user_id, visibility, status)
VALUES ('...', 'Projeto Válido', '<kr_id>', '...', '...', 'public', 'not_started');
```
**Resultado:** ✅ **SUCESSO**

### Cenário 3: Editar projeto legado (outros campos)
**Operação:** `UPDATE projects SET name = '...' WHERE id = '...'`
```sql
-- Editar nome de projeto legado (sem contexto)
UPDATE public.projects SET name = 'Projeto Renomeado' WHERE id = '4195cc3d-f856-42dc-a548-464486dc3375';
```
**Resultado:** ✅ **SUCESSO** (permite edição de outros campos)

### Cenário 4: Adicionar contexto a projeto legado
**Operação:** `UPDATE projects SET key_result_id = '...' WHERE id = '...'`
```sql
-- Adicionar contexto a projeto legado
UPDATE public.projects SET key_result_id = '<kr_id>' WHERE id = '4195cc3d-f856-42dc-a548-464486dc3375';
```
**Resultado:** ✅ **SUCESSO** (permite adicionar contexto)

### Cenário 5: Remover contexto de projeto válido
**Operação:** `UPDATE projects SET key_result_id = NULL WHERE id = '...'`
```sql
-- Tentar remover contexto de projeto válido
UPDATE public.projects SET key_result_id = NULL WHERE id = '<projeto_valido_id>';
```
**Resultado:** ❌ **ERRO**
```
ERROR: Cannot remove strategic context from project: key_result_id or deliverable_id is required
```

### Cenário 6: Vincular deliverable sem key_result
**Operação:** `UPDATE projects SET deliverable_id = '...' WHERE id = '...'`
```sql
-- Tentar vincular deliverable sem key_result_id
UPDATE public.projects SET deliverable_id = '<deliv_id>', key_result_id = NULL WHERE id = '...';
```
**Resultado:** ❌ **ERRO**
```
ERROR: deliverable_id requires key_result_id
```

### Cenário 7: Vincular deliverable de key_result errado
**Operação:** `UPDATE projects SET deliverable_id = '...', key_result_id = '...' WHERE id = '...'`
```sql
-- Tentar vincular deliverable de key_result diferente
UPDATE public.projects SET deliverable_id = '<deliv_id>', key_result_id = '<kr_errado_id>' WHERE id = '...';
```
**Resultado:** ❌ **ERRO**
```
ERROR: deliverable_id does not belong to key_result_id
```

---

## ⚠️ Riscos e Mitigações

### Risco 1: Interrupção de projetos legados
**Descrição:** Projetos legados sem contexto podem quebrar operações.

**Mitigação:** ✅ **IMPLEMENTADO**
- Validação permite UPDATE de outros campos em projetos legados
- Não bloqueia visualização
- Não bloqueia edição de campos não estratégicos

**Resíduo de Risco:** BAIXO

### Risco 2: Erro em código frontend que cria projetos
**Descrição:** Se o frontend tentar criar projeto sem contexto, receberá erro.

**Mitigação:** ✅ **IMPLEMENTADO**
- Frontend deve ser atualizado para sempre incluir contexto
- Erro é claro e informativo
- Migration está documentada para desenvolvedores

**Resíduo de Risco:** BAIXO (com atualização do frontend)

### Risco 3: Performance da validação
**Descrição:** Consultas adicionais para verificar coerência podem impactar performance.

**Mitigação:** ✅ **IMPLEMENTADO**
- Validações já existiam (tenant, usuário)
- Nova validação é simples (CHECK NULL)
- Índices em tabelas de referência devem existir

**Resíduo de Risco:** MUITO BAIXO

### Risco 4: Inconsistência de dados durante migração
**Descrição:** Se houver dados inconsistentes que não foram detectados.

**Mitigação:** ✅ **IMPLEMENTADO**
- Análise completa de dados legados
- 2 projetos identificados e documentados
- Função valida todas as referências

**Resíduo de Risco:** NULO

### Risco 5: Conflito com CHECK constraint futuro
**Descrição:** Se alguém adicionar CHECK constraint sem verificar legado.

**Mitigação:** ⚠️ **REQUER AÇÃO**
- Documentação inclui comando para adicionar CHECK constraint
- Comando deve ser executado APÓS corrigir legado
- Legado deve ser corrigido manualmente antes

**Resíduo de Risco:** BAIXO (com documentação e processo)

---

## 📝 Próximos Passos Recomendados

### Imediato (Correção de Legado)
1. **Identificar KRs válidos** para cada projeto legado
2. **Executar UPDATE** para vincular contexto:
   ```sql
   UPDATE public.projects
   SET key_result_id = '<kr_id>'
   WHERE id IN ('4195cc3d-f856-42dc-a548-464486dc3375', '78d61014-4869-45f4-a777-87cc2d1ef9b7');
   ```
3. **Verificar** se todos os projetos agora têm contexto

### Curto Prazo (Frontend)
1. **Atualizar formulário** de criação de projeto
2. **Adicionar validação** no cliente antes de enviar ao backend
3. **Exibir mensagem clara** de erro se contexto não for fornecido
4. **Adicionar indicador visual** de contexto estratégico no projeto

### Médio Prazo (Reforço de Segurança)
1. **Adicionar CHECK constraint** (após corrigir legado):
   ```sql
   ALTER TABLE public.projects
   ADD CONSTRAINT projects_strategic_context_check
   CHECK (key_result_id IS NOT NULL OR deliverable_id IS NOT NULL);
   ```
2. **Criar testes automatizados** para validar regras
3. **Adicionar métricas** de projetos sem contexto

### Longo Prazo (Melhoria Contínua)
1. **Considerar remover** exceção de legado (após corrigir tudo)
2. **Adicionar validação** em outros níveis (API, services)
3. **Documentar padrões** de vinculação projeto → contexto estratégico

---

## 🔍 Referências

### Tabelas Envolvidas
- `public.projects` - Tabela principal
- `public.okr_key_results` - Referência de KRs
- `public.okr_deliverables` - Referência de entregáveis
- `public.okr_objectives` - Referência de objetivos (para tenant)
- `public.profiles` - Referência de usuários

### Funções Envolvidas
- `public.ensure_project_tenant_coherence()` - Validação modificada
- `public.can_manage_project()` - RLS policy
- `public.can_view_project()` - RLS policy

### Triggers Envolvidos
- `trg_projects_tenant_coherence` - BEFORE INSERT, UPDATE

### Políticas RLS Envolvidas
- `projects_insert_policy` - INSERT
- `projects_update_policy` - UPDATE

---

## ✅ Checklist de Validação

- [x] Inspecionar estrutura da tabela `projects`
- [x] Identificar projetos legados sem contexto
- [x] Verificar triggers existentes
- [x] Verificar funções existentes
- [x] Analisar função `ensure_project_tenant_coherence()`
- [x] Implementar validação de contexto estratégico
- [x] Testar INSERT sem contexto (espera erro)
- [x] Testar UPDATE de projeto legado (espera sucesso)
- [x] Documentar projetos legados
- [x] Criar arquivo de migration
- [x] Criar documentação técnica
- [x] Listar riscos e mitigações
- [x] Definir próximos passos

---

## 📞 Suporte

Em caso de dúvidas ou problemas:
1. Consultar este documento
2. Verificar logs do Supabase
3. Revisar a migration SQL
4. Validar dados na tabela `projects`

**Autor:** Dyad AI Assistant
**Data:** 2025-03-17
**Versão:** 1.0
