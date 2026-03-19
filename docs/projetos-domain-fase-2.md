# Fase 2: Estabilização do Domínio de Projetos e Execução

**Data:** 2025-01-XX  
**Tipo:** TypeScript Domain Layer  
**Risco:** ZERO  
**Impacto:** ZERO  
**Compatibilidade:** TOTAL  

---

## OBJETIVO

Padronizar enums lógicos e helpers de domínio no backend/camada TypeScript, mantendo retrocompatibilidade total com dados legados.

---

## PRINCÍPIOS

✅ **NÃO remove valores antigos do banco**  
✅ **NÃO faz migration destrutiva**  
✅ **NÃO altera telas existentes**  
✅ **NÃO quebra imports existentes**  
✅ **Fornece camada de normalização segura**  

---

## ENTREGAS

### 1. Arquivo: `src/lib/projectsDomain.ts`

**Contratos Canônicos Criados:**
- `CanonicalWorkItemStatus`: 'todo' | 'in_progress' | 'blocked' | 'done'
- `CanonicalPriority`: 'low' | 'medium' | 'high' | 'critical'
- `CanonicalProjectRole`: 'owner' | 'contributor' | 'viewer'
- `CanonicalWorkItemType`: 'task' | 'milestone' | 'deliverable' | 'bug' | 'initiative'

**Contratos Legados Mantidos:**
- `LegacyProjectMemberRole`: 'member' | 'owner' | 'viewer' | 'editor'
- `LegacyWorkItemStatus`: 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'blocked'
- `LegacyWorkItemPriority`: 'low' | 'medium' | 'high' | 'critical'
- `LegacyWorkItemType`: 'task' | 'milestone' | 'checklist_item'
- `LegacyProjectStatus`: 'not_started' | 'on_track' | 'at_risk' | 'delayed' | 'completed'

**Normalizers Criados:**
- `normalizeProjectRole(role)` - Normaliza role de project member
- `normalizeWorkItemStatus(status)` - Normaliza status de work item
- `normalizeWorkItemPriority(priority)` - Normaliza prioridade de work item
- `normalizeWorkItemType(type)` - Normaliza tipo de work item

**Validators Criados:**
- `isCanonicalWorkItemStatus(status)` - Verifica se status é canônico
- `isCanonicalPriority(priority)` - Verifica se prioridade é canônica
- `isCanonicalProjectRole(role)` - Verifica se role é canônica
- `isCanonicalWorkItemType(type)` - Verifica se tipo é canônico

**Helpers de Ordenação Criados:**
- `getPriorityWeight(priority)` - Obtém peso numérico de prioridade
- `getStatusWeight(status)` - Obtém peso numérico de status
- `getProjectRoleWeight(role)` - Obtém peso numérico de role
- `comparePriorities(a, b)` - Compara duas prioridades
- `compareStatus(a, b)` - Compara dois status
- `compareProjectRoles(a, b)` - Compara duas roles

**Helpers de Display (UI) Criados:**
- `getWorkItemStatusLabel(status)` - Label em português
- `getPriorityLabel(priority)` - Label em português
- `getProjectRoleLabel(role)` - Label em português
- `getWorkItemTypeLabel(type)` - Label em português

**Helpers de Cor (UI - Tailwind) Criados:**
- `getWorkItemStatusColor(status)` - Classe CSS para status
- `getPriorityColor(priority)` - Classe CSS para prioridade
- `getProjectRoleColor(role)` - Classe CSS para role
- `getWorkItemTypeColor(type)` - Classe CSS para tipo

### 2. Arquivo: `src/lib/__tests__/projectsDomain.test.ts`

**Testes Criados:**
- Testes de normalização para todos os normalizers
- Testes de validação para todos os validators
- Testes de peso para todos os helpers de ordenação
- Testes de comparação para todos os comparators
- Testes de display helpers

---

## NORMALIZERS - EXEMPLOS DE ENTRADA E SAÍDA

### normalizeProjectRole

| Entrada | Saída | Motivo |
|---------|-------|--------|
| "member" | "contributor" | Normalização principal |
| "editor" | "contributor" | Tratamento de legado |
| "owner" | "owner" | Já canônico |
| "viewer" | "viewer" | Já canônico |
| "contributor" | "contributor" | Já canônico |

```typescript
import { normalizeProjectRole } from '@/lib/projectsDomain';

const role = normalizeProjectRole('member'); // → 'contributor'
const canonical = normalizeProjectRole('owner'); // → 'owner'
```

### normalizeWorkItemStatus

| Entrada | Saída | Motivo |
|---------|-------|--------|
| "backlog" | "todo" | Mapeamento legado |
| "todo" | "todo" | Já canônico |
| "in_progress" | "in_progress" | Já canônico |
| "review" | "in_progress" | Mapeamento legado |
| "done" | "done" | Já canônico |
| "blocked" | "blocked" | Já canônico |

```typescript
import { normalizeWorkItemStatus } from '@/lib/projectsDomain';

const status1 = normalizeWorkItemStatus('backlog'); // → 'todo'
const status2 = normalizeWorkItemStatus('in_progress'); // → 'in_progress'
```

### normalizeWorkItemPriority

| Entrada | Saída | Motivo |
|---------|-------|--------|
| "low" | "low" | Já canônico |
| "medium" | "medium" | Já canônico |
| "high" | "high" | Já canônico |
| "critical" | "critical" | Já canônico |

```typescript
import { normalizeWorkItemPriority } from '@/lib/projectsDomain';

const priority = normalizeWorkItemPriority('high'); // → 'high'
```

### normalizeWorkItemType

| Entrada | Saída | Motivo |
|---------|-------|--------|
| "task" | "task" | Já canônico |
| "checklist_item" | "task" | Mapeamento legado |
| "milestone" | "milestone" | Já canônico |
| "deliverable" | "deliverable" | Já canônico |
| "bug" | "bug" | Já canônico |
| "initiative" | "initiative" | Já canônico |

```typescript
import { normalizeWorkItemType } from '@/lib/projectsDomain';

const type1 = normalizeWorkItemType('checklist_item'); // → 'task'
const type2 = normalizeWorkItemType('bug'); // → 'bug'
```

---

## ORDENAÇÃO - PESOS NUMÉRICOS

### Prioridade (valores maiores = maior prioridade)

| Prioridade | Peso |
|------------|------|
| low | 1 |
| medium | 2 |
| high | 3 |
| critical | 4 |

### Status (valores maiores = estágio mais avançado)

| Status | Peso |
|--------|------|
| blocked | 0 |
| todo | 1 |
| in_progress | 2 |
| done | 3 |

### Role (valores maiores = mais permissões)

| Role | Peso |
|------|------|
| viewer | 1 |
| contributor | 2 |
| owner | 3 |

---

## LABELS DE EXIBIÇÃO (PORTUGUÊS)

### Status de Work Item

| Status | Label |
|--------|-------|
| todo | "A fazer" |
| in_progress | "Em andamento" |
| blocked | "Bloqueado" |
| done | "Concluído" |

### Prioridade

| Prioridade | Label |
|------------|-------|
| low | "Baixa" |
| medium | "Média" |
| high | "Alta" |
| critical | "Crítica" |

### Role de Project Member

| Role | Label |
|------|-------|
| owner | "Responsável" |
| contributor | "Colaborador" |
| viewer | "Observador" |

### Tipo de Work Item

| Tipo | Label |
|------|-------|
| task | "Tarefa" |
| milestone | "Marco" |
| deliverable | "Entregável" |
| bug | "Bug" |
| initiative | "Iniciativa" |

---

## CORES TAILWIND

### Status de Work Item

| Status | Classes |
|--------|---------|
| todo | bg-slate-100 text-slate-700 border-slate-300 |
| in_progress | bg-blue-100 text-blue-700 border-blue-300 |
| blocked | bg-red-100 text-red-700 border-red-300 |
| done | bg-green-100 text-green-700 border-green-300 |

### Prioridade

| Prioridade | Classes |
|------------|---------|
| low | bg-gray-100 text-gray-700 border-gray-300 |
| medium | bg-blue-100 text-blue-700 border-blue-300 |
| high | bg-orange-100 text-orange-700 border-orange-300 |
| critical | bg-red-100 text-red-700 border-red-300 |

### Role de Project Member

| Role | Classes |
|------|---------|
| owner | bg-purple-100 text-purple-700 border-purple-300 |
| contributor | bg-blue-100 text-blue-700 border-blue-300 |
| viewer | bg-gray-100 text-gray-700 border-gray-300 |

### Tipo de Work Item

| Tipo | Classes |
|------|---------|
| task | bg-slate-100 text-slate-700 border-slate-300 |
| milestone | bg-yellow-100 text-yellow-700 border-yellow-300 |
| deliverable | bg-green-100 text-green-700 border-green-300 |
| bug | bg-red-100 text-red-700 border-red-300 |
| initiative | bg-purple-100 text-purple-700 border-purple-300 |

---

## RISCOS E MITIGAÇÃO

### ✅ RISCO ZERO: SEM MIGRAÇÃO DESTRUTIVA

- Nenhuma coluna foi alterada
- Nenhum valor foi removido
- Nenhum check constraint foi modificado
- Nenhum trigger foi alterado

### ✅ IMPACTO ZERO: COMPATIBILIDADE TOTAL

- Todos os valores legados continuam funcionando
- Normalizers mapeiam valores antigos para novos
- Fallbacks seguros para valores desconhecidos
- Nenhum componente foi alterado

### ✅ SEGURANÇA: VALIDAÇÃO ROBUSTA

- Validators para verificar valores canônicos
- Warnings no console para valores desconhecidos
- Fallbacks seguros que não quebram o sistema
- Testes unitários cobrindo todos os cenários

---

## COMO USAR

### Exemplo 1: Normalizar role ao ler do banco

```typescript
import { normalizeProjectRole, getProjectRoleLabel } from '@/lib/projectsDomain';

const memberRole = projectMember.role_in_project; // 'member' (legado)
const canonicalRole = normalizeProjectRole(memberRole); // 'contributor'
const displayLabel = getProjectRoleLabel(canonicalRole); // 'Colaborador'
```

### Exemplo 2: Normalizar status ao ler do banco

```typescript
import { normalizeWorkItemStatus, getWorkItemStatusLabel } from '@/lib/projectsDomain';

const workItemStatus = workItem.status; // 'backlog' (legado)
const canonicalStatus = normalizeWorkItemStatus(workItemStatus); // 'todo'
const displayLabel = getWorkItemStatusLabel(canonicalStatus); // 'A fazer'
```

### Exemplo 3: Ordenar work items por prioridade

```typescript
import { comparePriorities } from '@/lib/projectsDomain';

const sortedWorkItems = [...workItems].sort((a, b) => 
  comparePriorities(a.priority, b.priority)
);
// critical > high > medium > low
```

### Exemplo 4: Verificar se valor é canônico

```typescript
import { isCanonicalWorkItemStatus, normalizeWorkItemStatus } from '@/lib/projectsDomain';

const status = workItem.status; // 'backlog' (legado)

if (!isCanonicalWorkItemStatus(status)) {
  console.log('Valor legado, normalizando...');
  const canonical = normalizeWorkItemStatus(status); // 'todo'
}
```

### Exemplo 5: Obter cor para UI

```typescript
import { getWorkItemStatusColor } from '@/lib/projectsDomain';

const workItemStatus = normalizeWorkItemStatus(workItem.status);
const colorClass = getWorkItemStatusColor(workItemStatus);
// 'bg-blue-100 text-blue-700 border-blue-300'

return <Badge className={colorClass}>{getWorkItemStatusLabel(workItemStatus)}</Badge>;
```

---

## CHECKLIST DE VALIDAÇÃO

### ✅ TESTES UNITÁRIOS CRIADOS

- [x] Testes de normalização para `normalizeProjectRole`
- [x] Testes de normalização para `normalizeWorkItemStatus`
- [x] Testes de normalização para `normalizeWorkItemPriority`
- [x] Testes de normalização para `normalizeWorkItemType`
- [x] Testes de validação para `isCanonicalWorkItemStatus`
- [x] Testes de validação para `isCanonicalPriority`
- [x] Testes de validação para `isCanonicalProjectRole`
- [x] Testes de validação para `isCanonicalWorkItemType`
- [x] Testes de peso para todos os helpers de ordenação
- [x] Testes de comparação para todos os comparators
- [x] Testes de display helpers

### ✅ COMPATIBILIDADE VERIFICADA

- [x] Valores legados de `project_members.role` suportados
- [x] Valores legados de `work_items.status` suportados
- [x] Valores legados de `work_items.priority` suportados
- [x] Valores legados de `work_items.type` suportados
- [x] Valores legados de `projects.status` não tocados
- [x] Nenhum import existente foi quebrado
- [x] Nenhuma página foi alterada

### ✅ SEGURANÇA VERIFICADA

- [x] Normalizers não lançam exceções
- [x] Fallbacks seguros implementados
- [x] Warnings no console para valores desconhecidos
- [x] Validators funcionam corretamente
- [x] Testes cobrem cenários de borda

---

## COMUNICAÇÃO AO TIME

### O que foi feito:
1. ✅ Criados contratos canônicos de domínio
2. ✅ Criados normalizers compatíveis com legado
3. ✅ Criados validators para verificar valores
4. ✅ Criados helpers de ordenação
5. ✅ Criados helpers de display (UI)
6. ✅ Criados helpers de cor (Tailwind)
7. ✅ Criados testes unitários

### O que NÃO foi feito:
1. ❌ Nenhuma página foi alterada
2. ❌ Nenhuma coluna foi removida
3. ❌ Nenhum valor legado foi excluído
4. ❌ Nenhuma migration destrutiva foi executada
5. ❌ Nenhuma notificação foi alterada

### Impacto no produto atual:
- **ZERO** - Produto continua funcionando exatamente como antes
- **ZERO** - Nenhuma funcionalidade existente foi alterada
- **ZERO** - Nenhum dado legado foi afetado

---

## PRÓXIMOS PASSOS (NÃO IMPLEMENTADOS NESTA FASE)

1. **NÃO** foi solicitado nesta fase:
   - [ ] Atualizar componentes para usar normalizers
   - [ ] Migrar dados legados no banco
   - [ ] Alterar telas para usar novos labels
   - [ ] Implementar novas features baseadas em contratos canônicos

2. **Para próximas fases:**
   - Atualizar componentes de UI para usar normalizers
   - Migrar gradualmente dados de `member` → `contributor`
   - Implementar novos tipos de work_item (bug, deliverable, initiative)
   - Considerar migração de `backlog` e `review` → `todo` e `in_progress`

---

## RESUMO FINAL

✅ **IMPLEMENTAÇÃO CONCLUÍDA COM SUCESSO**

- Contratos canônicos criados
- Normalizers compatíveis com legado
- Validators funcionando corretamente
- Helpers de ordenação prontos
- Helpers de display prontos
- Testes unitários criados
- Compatibilidade total mantida
- Risco zero confirmado
- **Nenhuma tela existente foi alterada**
- **Nenhum dado legado foi excluído**
- **Nenhum contrato foi quebrado**

**Status do produto atual:** ✅ FUNCIONANDO PERFEITAMENTE (zero impacto)
