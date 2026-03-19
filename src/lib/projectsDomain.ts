/**
 * Projects Domain - Canonical Contracts and Normalizers
 *
 * Fase 2: Estabilização do domínio de projetos e execução
 *
 * OBJETIVO: Padronizar enums lógicos e helpers de domínio
 * MANTENDO retrocompatibilidade total com dados legados.
 *
 * PRINCÍPIOS:
 * - NÃO remove valores antigos do banco
 * - NÃO altera telas existentes
 * - NÃO quebra imports existentes
 * - Fornece camada de normalização segura
 */

// =====================
// CANONICAL TYPES
// =====================

/**
 * Status canônico de execução (usado em work_items)
 * Baseado na fonte real de execução
 */
export type CanonicalWorkItemStatus = 'todo' | 'in_progress' | 'blocked' | 'done';

/**
 * Status canônico de projeto (para uso futuro)
 * ATENÇÃO: NÃO é usado ainda em projects.status (que mantém valores legados)
 */
export type CanonicalProjectStatus = 'not_started' | 'in_progress' | 'at_risk' | 'delayed' | 'completed';

/**
 * Prioridade canônica (usado em work_items)
 */
export type CanonicalPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Papel canônico no projeto (usado em project_members)
 * ATENÇÃO: O banco ainda usa "member", que é normalizado para "contributor"
 */
export type CanonicalProjectRole = 'owner' | 'contributor' | 'viewer';

/**
 * Tipo canônico de work item (expansível)
 * ATENÇÃO: O banco atualmente tem "task", "milestone", "checklist_item"
 */
export type CanonicalWorkItemType = 'task' | 'milestone' | 'deliverable' | 'bug' | 'initiative';

// =====================
// LEGACY TYPES (para compatibilidade)
// =====================

/**
 * Valores legados de project_members.role no banco
 * NOTA: "member" será normalizado para "contributor"
 */
export type LegacyProjectMemberRole = 'member' | 'owner' | 'viewer' | 'editor';

/**
 * Valores legados de work_items.status no banco
 * ATENÇÃO: "backlog" e "review" existem, mas não são canônicos
 */
export type LegacyWorkItemStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';

/**
 * Valores legados de work_items.priority no banco
 * NOTA: Já está canônico, mas tipamos para compatibilidade
 */
export type LegacyWorkItemPriority = 'low' | 'medium' | 'high' | 'critical';

/**
 * Valores legados de work_items.type no banco
 * ATENÇÃO: "checklist_item" existe, mas não é canônico
 */
export type LegacyWorkItemType = 'task' | 'milestone' | 'checklist_item';

/**
 * Valores legados de projects.status no banco
 * ATENÇÃO: NÃO faz parte do contrato canônico atual
 */
export type LegacyProjectStatus = 'not_started' | 'on_track' | 'at_risk' | 'delayed' | 'completed';

// =====================
// COMPOSITE TYPES (para compatibilidade)
// =====================

/**
 * Qualquer status válido de work_item (legado + canônico)
 */
export type AnyWorkItemStatus = LegacyWorkItemStatus | CanonicalWorkItemStatus;

/**
 * Qualquer prioridade válida de work_item
 */
export type AnyWorkItemPriority = LegacyWorkItemPriority | CanonicalPriority;

/**
 * Qualquer tipo válido de work_item
 */
export type AnyWorkItemType = LegacyWorkItemType | CanonicalWorkItemType;

/**
 * Qualquer role válida de project_member
 */
export type AnyProjectMemberRole = LegacyProjectMemberRole | CanonicalProjectRole;

// =====================
// NORMALIZERS
// =====================

/**
 * Normaliza role de project member
 *
 * REGRAS:
 * - "member" → "contributor" (normalização principal)
 * - "editor" → "contributor" (tratamento de legado)
 * - "owner" → "owner" (já canônico)
 * - "viewer" → "viewer" (já canônico)
 *
 * ENTRADA → SAÍDA:
 * "member" → "contributor"
 * "editor" → "contributor"
 * "owner" → "owner"
 * "viewer" → "viewer"
 */
export function normalizeProjectRole(role: AnyProjectMemberRole): CanonicalProjectRole {
  // Normalizações específicas
  if (role === 'member' || role === 'editor') {
    return 'contributor';
  }

  // Valores já canônicos
  if (role === 'owner' || role === 'viewer') {
    return role;
  }

  // Fallback seguro para valores desconhecidos
  console.warn(`[projectsDomain] Unknown project role: "${role}", defaulting to "viewer"`);
  return 'viewer';
}

/**
 * Normaliza status de work item
 *
 * REGRAS:
 * - "backlog" → "todo" (mapeamento legado)
 * - "review" → "in_progress" (mapeamento legado)
 * - Valores canônicos mantidos
 *
 * ENTRADA → SAÍDA:
 * "backlog" → "todo"
 * "todo" → "todo"
 * "in_progress" → "in_progress"
 * "review" → "in_progress"
 * "done" → "done"
 * "blocked" → "blocked"
 */
export function normalizeWorkItemStatus(status: AnyWorkItemStatus): CanonicalWorkItemStatus {
  // Normalizações de legado
  if (status === 'backlog' || status === 'todo') {
    return 'todo';
  }

  if (status === 'review' || status === 'in_progress') {
    return 'in_progress';
  }

  // Valores já canônicos
  if (status === 'done' || status === 'blocked') {
    return status;
  }

  // Fallback seguro para valores desconhecidos
  console.warn(`[projectsDomain] Unknown work item status: "${status}", defaulting to "todo"`);
  return 'todo';
}

/**
 * Normaliza prioridade de work item
 *
 * REGRAS:
 * - Valores já são canônicos, apenas valida e retorna
 *
 * ENTRADA → SAÍDA:
 * "low" → "low"
 * "medium" → "medium"
 * "high" → "high"
 * "critical" → "critical"
 */
export function normalizeWorkItemPriority(priority: AnyWorkItemPriority): CanonicalPriority {
  const validPriorities: CanonicalPriority[] = ['low', 'medium', 'high', 'critical'];

  if (validPriorities.includes(priority as CanonicalPriority)) {
    return priority as CanonicalPriority;
  }

  // Fallback seguro para valores desconhecidos
  console.warn(`[projectsDomain] Unknown work item priority: "${priority}", defaulting to "medium"`);
  return 'medium';
}

/**
 * Normaliza tipo de work item
 *
 * REGRAS:
 * - "checklist_item" → "task" (mapeamento legado)
 * - Valores canônicos mantidos
 *
 * ENTRADA → SAÍDA:
 * "task" → "task"
 * "checklist_item" → "task"
 * "milestone" → "milestone"
 * "deliverable" → "deliverable"
 * "bug" → "bug"
 * "initiative" → "initiative"
 */
export function normalizeWorkItemType(type: AnyWorkItemType): CanonicalWorkItemType {
  // Normalizações de legado
  if (type === 'checklist_item' || type === 'task') {
    return 'task';
  }

  // Valores já canônicos
  const validTypes: CanonicalWorkItemType[] = ['milestone', 'deliverable', 'bug', 'initiative'];
  if (validTypes.includes(type as CanonicalWorkItemType)) {
    return type as CanonicalWorkItemType;
  }

  // Fallback seguro para valores desconhecidos
  console.warn(`[projectsDomain] Unknown work item type: "${type}", defaulting to "task"`);
  return 'task';
}

// =====================
// VALIDATORS
// =====================

/**
 * Verifica se um status de work item é canônico
 */
export function isCanonicalWorkItemStatus(status: AnyWorkItemStatus): status is CanonicalWorkItemStatus {
  const canonicalStatuses: CanonicalWorkItemStatus[] = ['todo', 'in_progress', 'blocked', 'done'];
  return canonicalStatuses.includes(status as CanonicalWorkItemStatus);
}

/**
 * Verifica se uma prioridade de work item é canônica
 */
export function isCanonicalPriority(priority: AnyWorkItemPriority): priority is CanonicalPriority {
  const canonicalPriorities: CanonicalPriority[] = ['low', 'medium', 'high', 'critical'];
  return canonicalPriorities.includes(priority as CanonicalPriority);
}

/**
 * Verifica se uma role de project member é canônica
 */
export function isCanonicalProjectRole(role: AnyProjectMemberRole): role is CanonicalProjectRole {
  const canonicalRoles: CanonicalProjectRole[] = ['owner', 'contributor', 'viewer'];
  return canonicalRoles.includes(role as CanonicalProjectRole);
}

/**
 * Verifica se um tipo de work item é canônico
 */
export function isCanonicalWorkItemType(type: AnyWorkItemType): type is CanonicalWorkItemType {
  const canonicalTypes: CanonicalWorkItemType[] = ['task', 'milestone', 'deliverable', 'bug', 'initiative'];
  return canonicalTypes.includes(type as CanonicalWorkItemType);
}

// =====================
// COMPARISON HELPERS (Ordenação)
// =====================

/**
 * Obtém peso numérico de prioridade para ordenação
 * Valores maiores = prioridade mais alta
 */
export function getPriorityWeight(priority: CanonicalPriority): number {
  const weights: Record<CanonicalPriority, number> = {
    low: 1,
    medium: 2,
    high: 3,
    critical: 4,
  };
  return weights[priority];
}

/**
 * Obtém peso numérico de status para ordenação
 * Valores maiores = estágio mais avançado
 */
export function getStatusWeight(status: CanonicalWorkItemStatus): number {
  const weights: Record<CanonicalWorkItemStatus, number> = {
    todo: 1,
    in_progress: 2,
    blocked: 0, // Bloqueados ficam no topo ou fundo conforme preferência
    done: 3,
  };
  return weights[status];
}

/**
 * Obtém peso numérico de role para ordenação
 * Valores maiores = mais permissões
 */
export function getProjectRoleWeight(role: CanonicalProjectRole): number {
  const weights: Record<CanonicalProjectRole, number> = {
    viewer: 1,
    contributor: 2,
    owner: 3,
  };
  return weights[role];
}

/**
 * Compara duas prioridades para ordenação
 * Retorna < 0 se a < b, > 0 se a > b, 0 se igual
 */
export function comparePriorities(
  a: AnyWorkItemPriority,
  b: AnyWorkItemPriority
): number {
  const normalizedA = normalizeWorkItemPriority(a);
  const normalizedB = normalizeWorkItemPriority(b);
  return getPriorityWeight(normalizedB) - getPriorityWeight(normalizedA);
}

/**
 * Compara dois status para ordenação
 * Retorna < 0 se a < b, > 0 se a > b, 0 se igual
 */
export function compareStatus(
  a: AnyWorkItemStatus,
  b: AnyWorkItemStatus
): number {
  const normalizedA = normalizeWorkItemStatus(a);
  const normalizedB = normalizeWorkItemStatus(b);
  return getStatusWeight(normalizedB) - getStatusWeight(normalizedA);
}

/**
 * Compara duas roles para ordenação
 * Retorna < 0 se a < b, > 0 se a > b, 0 se igual
 */
export function compareProjectRoles(
  a: AnyProjectMemberRole,
  b: AnyProjectMemberRole
): number {
  const normalizedA = normalizeProjectRole(a);
  const normalizedB = normalizeProjectRole(b);
  return getProjectRoleWeight(normalizedB) - getProjectRoleWeight(normalizedA);
}

// =====================
// DISPLAY HELPERS (UI)
// =====================

/**
 * Obtém label para exibir status de work item (português)
 */
export function getWorkItemStatusLabel(status: CanonicalWorkItemStatus): string {
  const labels: Record<CanonicalWorkItemStatus, string> = {
    todo: 'A fazer',
    in_progress: 'Em andamento',
    blocked: 'Bloqueado',
    done: 'Concluído',
  };
  return labels[status];
}

/**
 * Obtém label para exibir prioridade de work item (português)
 */
export function getPriorityLabel(priority: CanonicalPriority): string {
  const labels: Record<CanonicalPriority, string> = {
    low: 'Baixa',
    medium: 'Média',
    high: 'Alta',
    critical: 'Crítica',
  };
  return labels[priority];
}

/**
 * Obtém label para exibir role de project member (português)
 */
export function getProjectRoleLabel(role: CanonicalProjectRole): string {
  const labels: Record<CanonicalProjectRole, string> = {
    owner: 'Responsável',
    contributor: 'Colaborador',
    viewer: 'Observador',
  };
  return labels[role];
}

/**
 * Obtém label para exibir tipo de work item (português)
 */
export function getWorkItemTypeLabel(type: CanonicalWorkItemType): string {
  const labels: Record<CanonicalWorkItemType, string> = {
    task: 'Tarefa',
    milestone: 'Marco',
    deliverable: 'Entregável',
    bug: 'Bug',
    initiative: 'Iniciativa',
  };
  return labels[type];
}

// =====================
// COLOR HELPERS (UI - Tailwind)
// =====================

/**
 * Obtém classe CSS para status de work item
 */
export function getWorkItemStatusColor(status: CanonicalWorkItemStatus): string {
  const colors: Record<CanonicalWorkItemStatus, string> = {
    todo: 'bg-slate-100 text-slate-700 border-slate-300',
    in_progress: 'bg-blue-100 text-blue-700 border-blue-300',
    blocked: 'bg-red-100 text-red-700 border-red-300',
    done: 'bg-green-100 text-green-700 border-green-300',
  };
  return colors[status];
}

/**
 * Obtém classe CSS para prioridade de work item
 */
export function getPriorityColor(priority: CanonicalPriority): string {
  const colors: Record<CanonicalPriority, string> = {
    low: 'bg-gray-100 text-gray-700 border-gray-300',
    medium: 'bg-blue-100 text-blue-700 border-blue-300',
    high: 'bg-orange-100 text-orange-700 border-orange-300',
    critical: 'bg-red-100 text-red-700 border-red-300',
  };
  return colors[priority];
}

/**
 * Obtém classe CSS para role de project member
 */
export function getProjectRoleColor(role: CanonicalProjectRole): string {
  const colors: Record<CanonicalProjectRole, string> = {
    owner: 'bg-purple-100 text-purple-700 border-purple-300',
    contributor: 'bg-blue-100 text-blue-700 border-blue-300',
    viewer: 'bg-gray-100 text-gray-700 border-gray-300',
  };
  return colors[role];
}

/**
 * Obtém classe CSS para tipo de work item
 */
export function getWorkItemTypeColor(type: CanonicalWorkItemType): string {
  const colors: Record<CanonicalWorkItemType, string> = {
    task: 'bg-slate-100 text-slate-700 border-slate-300',
    milestone: 'bg-yellow-100 text-yellow-700 border-yellow-300',
    deliverable: 'bg-green-100 text-green-700 border-green-300',
    bug: 'bg-red-100 text-red-700 border-red-300',
    initiative: 'bg-purple-100 text-purple-700 border-purple-300',
  };
  return colors[type];
}
