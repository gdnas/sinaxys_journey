# Exemplos de Uso: Projects Domain

Este arquivo mostra exemplos práticos de como usar os contratos canônicos e normalizers do `projectsDomain.ts`.

---

## Exemplo 1: Normalizar Role ao Ler do Banco

```typescript
import { 
  normalizeProjectRole,
  getProjectRoleLabel,
  getProjectRoleColor 
} from '@/lib/projectsDomain';

// Ler do banco (valor legado)
const memberRole = projectMember.role_in_project; // 'member'

// Normalizar para valor canônico
const canonicalRole = normalizeProjectRole(memberRole); // 'contributor'

// Obter label para exibição
const displayLabel = getProjectRoleLabel(canonicalRole); // 'Colaborador'

// Obter classes CSS
const colorClass = getProjectRoleColor(canonicalRole); // 'bg-blue-100 text-blue-700 border-blue-300'

// Usar no React
return (
  <Badge className={colorClass}>
    {displayLabel}
  </Badge>
);
```

---

## Exemplo 2: Normalizar Status ao Ler do Banco

```typescript
import { 
  normalizeWorkItemStatus,
  getWorkItemStatusLabel,
  getWorkItemStatusColor 
} from '@/lib/projectsDomain';

// Ler do banco (valor legado)
const workItemStatus = workItem.status; // 'backlog'

// Normalizar para valor canônico
const canonicalStatus = normalizeWorkItemStatus(workItemStatus); // 'todo'

// Obter label para exibição
const displayLabel = getWorkItemStatusLabel(canonicalStatus); // 'A fazer'

// Obter classes CSS
const colorClass = getWorkItemStatusColor(canonicalStatus); // 'bg-slate-100 text-slate-700 border-slate-300'

// Usar no React
return (
  <Badge className={colorClass}>
    {displayLabel}
  </Badge>
);
```

---

## Exemplo 3: Ordenar Work Items por Prioridade

```typescript
import { comparePriorities } from '@/lib/projectsDomain';

const workItems = [
  { title: 'Task A', priority: 'low' },
  { title: 'Task B', priority: 'critical' },
  { title: 'Task C', priority: 'medium' },
  { title: 'Task D', priority: 'high' },
];

// Ordenar (critical > high > medium > low)
const sortedWorkItems = [...workItems].sort((a, b) => 
  comparePriorities(a.priority, b.priority)
);

// Resultado:
// [
//   { title: 'Task B', priority: 'critical' },
//   { title: 'Task D', priority: 'high' },
//   { title: 'Task C', priority: 'medium' },
//   { title: 'Task A', priority: 'low' },
// ]
```

---

## Exemplo 4: Verificar se Valor é Canônico

```typescript
import { 
  isCanonicalWorkItemStatus,
  normalizeWorkItemStatus 
} from '@/lib/projectsDomain';

const workItemStatus = workItem.status; // 'backlog' (legado)

if (!isCanonicalWorkItemStatus(workItemStatus)) {
  console.log('Valor legado detectado, normalizando...');
  const canonical = normalizeWorkItemStatus(workItemStatus); // 'todo'
  
  // Usar valor canônico
  processWorkItem(canonical);
} else {
  // Valor já é canônico
  processWorkItem(workItemStatus);
}
```

---

## Exemplo 5: Filtro de Work Items por Status Canônico

```typescript
import { 
  normalizeWorkItemStatus,
  type CanonicalWorkItemStatus 
} from '@/lib/projectsDomain';

const workItems = [
  { title: 'Task A', status: 'backlog' },     // legado
  { title: 'Task B', status: 'todo' },        // canônico
  { title: 'Task C', status: 'in_progress' }, // canônico
  { title: 'Task D', status: 'review' },      // legado
  { title: 'Task E', status: 'done' },        // canônico
];

// Filtrar apenas tarefas "A fazer"
const todoTasks = workItems.filter(item => 
  normalizeWorkItemStatus(item.status) === 'todo'
);

// Resultado:
// [
//   { title: 'Task A', status: 'backlog' },
//   { title: 'Task B', status: 'todo' },
// ]
```

---

## Exemplo 6: Ordenar Membros por Permissão

```typescript
import { compareProjectRoles } from '@/lib/projectsDomain';

const members = [
  { name: 'Alice', role: 'viewer' },
  { name: 'Bob', role: 'member' },     // legado
  { name: 'Charlie', role: 'owner' },
  { name: 'Diana', role: 'editor' },    // legado
  { name: 'Eve', role: 'contributor' }, // canônico
];

// Ordenar por nível de permissão (owner > contributor > viewer)
const sortedMembers = [...members].sort((a, b) => 
  compareProjectRoles(a.role, b.role)
);

// Resultado:
// [
//   { name: 'Charlie', role: 'owner' },
//   { name: 'Bob', role: 'member' },
//   { name: 'Diana', role: 'editor' },
//   { name: 'Eve', role: 'contributor' },
//   { name: 'Alice', role: 'viewer' },
// ]
```

---

## Exemplo 7: Tabela de Work Items com Status Normalizado

```typescript
import { 
  normalizeWorkItemStatus,
  getWorkItemStatusLabel,
  getWorkItemStatusColor 
} from '@/lib/projectsDomain';

import { Badge } from '@/components/ui/badge';

function WorkItemTable({ workItems }: { workItems: any[] }) {
  return (
    <table>
      <thead>
        <tr>
          <th>Título</th>
          <th>Status</th>
          <th>Prioridade</th>
        </tr>
      </thead>
      <tbody>
        {workItems.map((item) => {
          const canonicalStatus = normalizeWorkItemStatus(item.status);
          
          return (
            <tr key={item.id}>
              <td>{item.title}</td>
              <td>
                <Badge className={getWorkItemStatusColor(canonicalStatus)}>
                  {getWorkItemStatusLabel(canonicalStatus)}
                </Badge>
              </td>
              <td>{item.priority}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
```

---

## Exemplo 8: Dropdown de Filtros com Status Canônico

```typescript
import { getWorkItemStatusLabel, type CanonicalWorkItemStatus } from '@/lib/projectsDomain';

const canonicalStatuses: CanonicalWorkItemStatus[] = ['todo', 'in_progress', 'blocked', 'done'];

function StatusFilter({ selected, onChange }: { selected: string | null, onChange: (status: string | null) => void }) {
  return (
    <select 
      value={selected || ''}
      onChange={(e) => onChange(e.target.value || null)}
    >
      <option value="">Todos os status</option>
      {canonicalStatuses.map((status) => (
        <option key={status} value={status}>
          {getWorkItemStatusLabel(status)}
        </option>
      ))}
    </select>
  );
}
```

---

## Exemplo 9: Estatísticas de Status (Normalizadas)

```typescript
import { normalizeWorkItemStatus, type CanonicalWorkItemStatus } from '@/lib/projectsDomain';

function getStatusStats(workItems: any[]) {
  const stats: Record<CanonicalWorkItemStatus, number> = {
    todo: 0,
    in_progress: 0,
    blocked: 0,
    done: 0,
  };

  workItems.forEach((item) => {
    const canonicalStatus = normalizeWorkItemStatus(item.status);
    stats[canonicalStatus]++;
  });

  return stats;
}

// Uso
const workItems = [
  { status: 'backlog' },
  { status: 'todo' },
  { status: 'review' },
  { status: 'done' },
];

const stats = getStatusStats(workItems);
// stats = { todo: 2, in_progress: 0, blocked: 0, done: 1 }
```

---

## Exemplo 10: Card de Work Item Completo

```typescript
import { 
  normalizeWorkItemStatus,
  normalizeWorkItemPriority,
  normalizeWorkItemType,
  getWorkItemStatusLabel,
  getPriorityLabel,
  getWorkItemTypeLabel,
  getWorkItemStatusColor,
  getPriorityColor,
  getWorkItemTypeColor,
} from '@/lib/projectsDomain';

import { Badge } from '@/components/ui/badge';

function WorkItemCard({ workItem }: { workItem: any }) {
  const canonicalStatus = normalizeWorkItemStatus(workItem.status);
  const canonicalPriority = normalizeWorkItemPriority(workItem.priority);
  const canonicalType = normalizeWorkItemType(workItem.type);

  return (
    <div className="border rounded-lg p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Badge className={getWorkItemTypeColor(canonicalType)}>
              {getWorkItemTypeLabel(canonicalType)}
            </Badge>
            <Badge className={getWorkItemStatusColor(canonicalStatus)}>
              {getWorkItemStatusLabel(canonicalStatus)}
            </Badge>
          </div>
          <h3 className="font-semibold">{workItem.title}</h3>
          {workItem.description && (
            <p className="text-sm text-muted-foreground mt-1">
              {workItem.description}
            </p>
          )}
        </div>
        <Badge className={getPriorityColor(canonicalPriority)}>
          {getPriorityLabel(canonicalPriority)}
        </Badge>
      </div>
    </div>
  );
}
```

---

## Exemplo 11: Migração Gradual de Dados Legados

```typescript
import { 
  normalizeWorkItemStatus,
  type CanonicalWorkItemStatus,
} from '@/lib/projectsDomain';

// Função para migrar work items para status canônico
async function migrateWorkItemsToCanonicalStatus() {
  const { data: workItems, error } = await supabase
    .from('work_items')
    .select('id, status');

  if (error) throw error;

  const updates = workItems
    .filter(item => !isCanonicalWorkItemStatus(item.status))
    .map(item => ({
      id: item.id,
      canonicalStatus: normalizeWorkItemStatus(item.status)
    }));

  // Atualizar em lote (supabase supports batch updates)
  for (const { id, canonicalStatus } of updates) {
    await supabase
      .from('work_items')
      .update({ status: canonicalStatus })
      .eq('id', id);
  }

  console.log(`Migrados ${updates.length} work items para status canônico`);
}

// Uso
await migrateWorkItemsToCanonicalStatus();
```

---

## Exemplo 12: Dashboard com Métricas Normalizadas

```typescript
import { 
  normalizeWorkItemStatus,
  type CanonicalWorkItemStatus,
} from '@/lib/projectsDomain';

function ProjectDashboard({ workItems }: { workItems: any[] }) {
  const total = workItems.length;
  const done = workItems.filter(
    item => normalizeWorkItemStatus(item.status) === 'done'
  ).length;
  
  const progressPct = total > 0 ? Math.round((done / total) * 100) : 0;

  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <div className="text-2xl font-bold">{total}</div>
        <div className="text-sm text-muted-foreground">Total de tarefas</div>
      </Card>
      <Card>
        <div className="text-2xl font-bold">{done}</div>
        <div className="text-sm text-muted-foreground">Concluídas</div>
      </Card>
      <Card>
        <div className="text-2xl font-bold">{progressPct}%</div>
        <div className="text-sm text-muted-foreground">Progresso</div>
      </Card>
    </div>
  );
}
```

---

## Resumo

- Use `normalize*` para converter valores legados para canônicos
- Use `get*Label` para obter labels em português para exibição
- Use `get*Color` para obter classes CSS (Tailwind)
- Use `compare*` para ordenar
- Use `isCanonical*` para verificar se um valor já é canônico

Todos os normalizers são seguros, não lançam exceções e têm fallbacks para valores desconhecidos.
