# Exemplos Práticos: Fase 3 - Migração para Camada Derivada

Este arquivo mostra exemplos práticos de como ficou a migração da leitura para a camada derivada de execução.

---

## Exemplo 1: Objeto de Projeto (ProjetosLista.tsx)

### ANTES (apenas dados de projects)

```typescript
const project = {
  id: "uuid",
  name: "Projeto teste",
  description: "Descrição do projeto",
  status: "not_started", // Status legado
  owner_user_id: "owner-uuid",
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-10T00:00:00Z",
  due_date: "2025-02-01",
  
  // Relacionamentos
  owner_name: "João Silva",
  owner_avatar_url: "https://...",
  department_name: "TI",
  department_names: ["TI"],
  key_result_title: "KR Teste",
  deliverable_title: "Entregável Teste",
  okr_title: "OKR Teste",
  okr_level: "tático",
  
  // Contagem de membros
  member_count: 5,
};
```

### DEPOIS (projects + execution summary)

```typescript
const project = {
  id: "uuid",
  name: "Projeto teste",
  description: "Descrição do projeto",
  status: "not_started", // Status legado (preservado)
  owner_user_id: "owner-uuid",
  created_at: "2025-01-01T00:00:00Z",
  updated_at: "2025-01-10T00:00:00Z",
  due_date: "2025-02-01",
  
  // Relacionamentos (preservados)
  owner_name: "João Silva",
  owner_avatar_url: "https://...",
  department_name: "TI",
  department_names: ["TI"],
  key_result_title: "KR Teste",
  deliverable_title: "Entregável Teste",
  okr_title: "OKR Teste",
  okr_level: "tático",
  
  // Contagem de membros (preservado)
  member_count: 5,
  
  // NOVOS: Dados derivados da execução
  derived_status: "in_progress", // Status derivado dos work_items
  progress_pct: 33, // 33% de conclusão
  total_work_items: 3, // Total de work_items
  done_work_items: 1, // 1 concluído
  in_progress_work_items: 1, // 1 em andamento
  todo_work_items: 1, // 1 pendente
  blocked_work_items: 0, // 0 bloqueados
  overdue_work_items: 0, // 0 atrasados
};
```

---

## Exemplo 2: Status Exibido no Card

### Cenário 1: Projeto legado (sem work_items)

```typescript
const project = {
  status: "not_started",
  derived_status: null, // Não há work_items
};

// No ProjectCard.tsx
const displayedStatus = project.derived_status || project.status;
// displayedStatus = "not_started"

// Exibido como: "Não iniciado"
```

### Cenário 2: Projeto com work_items

```typescript
const project = {
  status: "not_started", // Status legado (ignorado)
  derived_status: "in_progress", // Status derivado (usado)
};

// No ProjectCard.tsx
const displayedStatus = project.derived_status || project.status;
// displayedStatus = "in_progress"

// Exibido como: "Em andamento"
```

---

## Exemplo 3: Métricas Derivadas no Card

### Cenário: Projeto com execução ativa

```typescript
const project = {
  derived_status: "in_progress",
  progress_pct: 33,
  total_work_items: 3,
  done_work_items: 1,
  in_progress_work_items: 1,
  todo_work_items: 1,
};

// No painel lateral do ProjectCard.tsx
{hasExecutionData && totalWorkItems > 0 && (
  <>
    <div className="mt-2 pt-2 border-t border-gray-200">
      <div>Tarefas: <span>{totalWorkItems}</span></div>
      <div className="mt-1">Progresso: <span>{progressPct}%</span></div>
      <div className="mt-1 text-xs">
        <span className="text-green-600">{doneWorkItems} concluídas</span>
        {inProgressWorkItems > 0 && (
          <>, <span className="text-blue-600">{inProgressWorkItems} em andamento</span></>
        )}
      </div>
    </div>
  </>
)}

// Exibido como:
// Tarefas: 3
// Progresso: 33%
// 1 concluídas, 1 em andamento
```

---

## Exemplo 4: Painel de Execução no Detalhe

### Cenário: Projeto com work_items

```typescript
const executionSummary = {
  total_work_items: 10,
  done_work_items: 3,
  in_progress_work_items: 2,
  todo_work_items: 4,
  blocked_work_items: 1,
  overdue_work_items: 2,
  progress_pct: 30, // (3 / 10) * 100
  derived_status: "in_progress",
};

// No ProjetoDetail.tsx
const totalWorkItems = executionSummary?.total_work_items ?? 0;
const progressPct = executionSummary?.progress_pct ?? 0;
const doneWorkItems = executionSummary?.done_work_items ?? 0;
const inProgressWorkItems = executionSummary?.in_progress_work_items ?? 0;

// Exibido como painel de métricas:
{
  /* Progresso: 30% */
  /* Total: 10 */
  /* Concluídas: 3 (verde) */
  /* Em andamento: 2 (azul) */
}
```

### Cenário: Projeto sem work_items

```typescript
const executionSummary = {
  total_work_items: 0,
  done_work_items: 0,
  in_progress_work_items: 0,
  todo_work_items: 0,
  blocked_work_items: 0,
  overdue_work_items: 0,
  progress_pct: 0,
  derived_status: "todo",
};

// No ProjetoDetail.tsx
const totalWorkItems = executionSummary?.total_work_items ?? 0;

// Como totalWorkItems = 0, painel de métricas NÃO aparece
// Exibe apenas: "Nenhum work_item cadastrado neste projeto ainda."
```

---

## Exemplo 5: Mapeamento de Status

### Labels de Status (ProjectCard.tsx, ProjetoDetail.tsx)

```typescript
function getProjectStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    // Status legados de projects
    not_started: "Não iniciado",
    on_track: "No prazo",
    at_risk: "Em risco",
    delayed: "Atrasado",
    completed: "Concluído",
    
    // Status derivados de work_items
    todo: "A fazer",
    in_progress: "Em andamento",
    blocked: "Bloqueado",
    done: "Concluído",
  };
  return statusMap[status] || status;
}

// Uso
getProjectStatusLabel("not_started"); // "Não iniciado"
getProjectStatusLabel("in_progress"); // "Em andamento"
getProjectStatusLabel("done"); // "Concluído"
```

### Variants de Badge (ProjectCard.tsx)

```typescript
function getProjectStatusBadgeVariant(status: string) {
  const variantMap = {
    // Status legados
    not_started: "outline",
    on_track: "secondary",
    at_risk: "destructive",
    delayed: "destructive",
    completed: "default",
    
    // Status derivados
    todo: "outline",
    in_progress: "secondary",
    blocked: "destructive",
    done: "default",
  };
  return variantMap[status] || "default";
}

// Uso
getProjectStatusBadgeVariant("not_started"); // "outline"
getProjectStatusBadgeVariant("in_progress"); // "secondary"
getProjectStatusBadgeVariant("blocked"); // "destructive"
```

---

## Exemplo 6: Normalização de Status de Work Item

### Cenário: Tarefas com status legados

```typescript
// No ProjetoDetail.tsx
function taskStatusLabel(status: string) {
  return getWorkItemStatusLabel(normalizeWorkItemStatus(status as any));
}

// Exemplos
taskStatusLabel("backlog"); // "A fazer" (normalizado de backlog → todo)
taskStatusLabel("todo"); // "A fazer" (já canônico)
taskStatusLabel("review"); // "Em andamento" (normalizado de review → in_progress)
taskStatusLabel("in_progress"); // "Em andamento" (já canônico)
taskStatusLabel("blocked"); // "Bloqueado" (já canônico)
taskStatusLabel("done"); // "Concluído" (já canônico)
```

---

## Exemplo 7: Fluxo de Dados na Listagem

### Fluxo Completo (ProjetosLista.tsx)

```typescript
// 1. Buscar projects
const { data: projects } = await supabase
  .from("projects")
  .select("*, project_member_count:project_members(count)");

// 2. Extrair IDs dos projetos
const projectIds = projects.map((row) => row.id);

// 3. Buscar execution summaries em lote
const executionSummaries = await getProjectExecutionSummariesByProjectIds(projectIds);

// 4. Criar mapa de summaries
const summariesMap = new Map(
  executionSummaries.map((summary) => [summary.project_id, summary])
);

// 5. Merge dos dados
const mappedProjects = projects.map((project) => {
  const summary = summariesMap.get(project.id);
  
  return {
    ...project,
    // Campos derivados (ou null se não houver summary)
    derived_status: summary?.derived_status ?? null,
    progress_pct: summary?.progress_pct ?? null,
    total_work_items: summary?.total_work_items ?? 0,
    done_work_items: summary?.done_work_items ?? 0,
    in_progress_work_items: summary?.in_progress_work_items ?? 0,
    todo_work_items: summary?.todo_work_items ?? 0,
    blocked_work_items: summary?.blocked_work_items ?? 0,
    overdue_work_items: summary?.overdue_work_items ?? 0,
  };
});

// 6. Renderizar cards
mappedProjects.map((project) => (
  <ProjectCard key={project.id} project={project} />
));
```

---

## Exemplo 8: Fluxo de Dados no Detalhe

### Fluxo Completo (ProjetoDetail.tsx)

```typescript
// 1. Buscar projeto
const { data: projectData } = await supabase
  .from("projects")
  .select("*, project_members(user_id, role_in_project)")
  .eq("id", projectId);

// 2. Buscar execution summary derivado
const summary = await getProjectExecutionSummary(projectId);
setExecutionSummary(summary);

// 3. Usar dados
const displayedStatus = executionSummary?.derived_status || projectData?.status;
const totalWorkItems = executionSummary?.total_work_items ?? 0;
const progressPct = executionSummary?.progress_pct ?? 0;

// 4. Exibir no JSX
<Badge variant="outline">{statusLabel(displayedStatus)}</Badge>

// 5. Exibir painel de execução se houver work_items
{totalWorkItems > 0 && (
  <div className="grid gap-4 md:grid-cols-4">
    <MetricCard label="Progresso" value={`${progressPct}%`} />
    <MetricCard label="Total" value={totalWorkItems} />
    <MetricCard label="Concluídas" value={doneWorkItems} color="green" />
    <MetricCard label="Em andamento" value={inProgressWorkItems} color="blue" />
  </div>
)}
```

---

## Exemplo 9: Compatibilidade com Dados Legados

### Cenário: Projeto criado antes da migração

```typescript
// Dados legados (apenas projects table)
const legacyProject = {
  id: "uuid",
  name: "Projeto antigo",
  status: "not_started",
  // ... outros campos
  
  // SEM execution summary
  derived_status: null,
  progress_pct: null,
  total_work_items: null,
  // ...
};

// No código
const displayedStatus = legacyProject.derived_status || legacyProject.status;
// displayedStatus = "not_started"

// Exibido como: "Não iniciado" (status legado)

// Card NÃO mostra métricas derivadas (porque total_work_items = null)
```

### Cenário: Projeto com work_items adicionados depois

```typescript
// Assim que work_items são adicionados
const projectWithExecution = {
  id: "uuid",
  name: "Projeto antigo",
  status: "not_started", // Status legado (preservado)
  
  // Execution summary agora disponível
  derived_status: "todo", // Calculado dos work_items
  progress_pct: 0,
  total_work_items: 5,
  // ...
};

// No código
const displayedStatus = projectWithExecution.derived_status || projectWithExecution.status;
// displayedStatus = "todo"

// Exibido como: "A fazer" (status derivado)

// Card AGORA mostra métricas derivadas
```

---

## Exemplo 10: Fallback Seguro

### Cenário: Execution summary falha

```typescript
// Tenta buscar execution summary
let executionSummary = null;
try {
  executionSummary = await getProjectExecutionSummary(projectId);
} catch (error) {
  console.error("Erro ao buscar execution summary:", error);
}

// Usa fallback seguro
const displayedStatus = executionSummary?.derived_status || project?.status;
const totalWorkItems = executionSummary?.total_work_items ?? 0;
const progressPct = executionSummary?.progress_pct ?? 0;

// Se executionSummary = null:
// - Usa project.status (legado)
// - totalWorkItems = 0
// - progressPct = 0

// Layout continua funcionando normalmente
```

---

## Resumo

- **Objeto de projeto** agora tem campos derivados adicionais
- **Status exibido** é `derived_status` se disponível, senão usa `status` legado
- **Métricas derivadas** aparecem se houver work_items
- **Projetos legados** continuam funcionando com status legado
- **Transição** é transparente quando work_items são adicionados
- **Fallbacks** são seguros em caso de erro
