/**
 * Constantes compartilhadas para status de Work Items
 * Fonte única de verdade para todos os componentes
 */

export const WORK_ITEM_STATUS = {
  BACKLOG: 'backlog',
  TODO: 'todo',
  IN_PROGRESS: 'in_progress',
  BLOCKED: 'blocked',
  DONE: 'done',
} as const;

export type WorkItemStatus = typeof WORK_ITEM_STATUS[keyof typeof WORK_ITEM_STATUS];

/**
 * Lista ordenada de status para Kanban
 */
export const WORK_ITEM_STATUS_ORDER: WorkItemStatus[] = [
  WORK_ITEM_STATUS.BACKLOG,
  WORK_ITEM_STATUS.TODO,
  WORK_ITEM_STATUS.IN_PROGRESS,
  WORK_ITEM_STATUS.BLOCKED,
  WORK_ITEM_STATUS.DONE,
];

/**
 * Rótulos de status em Português
 */
export const WORK_ITEM_STATUS_LABELS: Record<WorkItemStatus, string> = {
  [WORK_ITEM_STATUS.BACKLOG]: 'Backlog',
  [WORK_ITEM_STATUS.TODO]: 'A fazer',
  [WORK_ITEM_STATUS.IN_PROGRESS]: 'Em andamento',
  [WORK_ITEM_STATUS.BLOCKED]: 'Bloqueado',
  [WORK_ITEM_STATUS.DONE]: 'Concluído',
};

/**
 * Variantes de badge para cada status
 */
export const WORK_ITEM_STATUS_VARIANTS: Record<WorkItemStatus, 'default' | 'secondary' | 'destructive' | 'outline'> = {
  [WORK_ITEM_STATUS.BACKLOG]: 'secondary',
  [WORK_ITEM_STATUS.TODO]: 'outline',
  [WORK_ITEM_STATUS.IN_PROGRESS]: 'secondary',
  [WORK_ITEM_STATUS.BLOCKED]: 'destructive',
  [WORK_ITEM_STATUS.DONE]: 'default',
};

/**
 * Obtém o rótulo de um status
 */
export function getWorkItemStatusLabel(status: string): string {
  return WORK_ITEM_STATUS_LABELS[status as WorkItemStatus] || status;
}

/**
 * Obtém a variante de badge para um status
 */
export function getWorkItemStatusVariant(status: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  return WORK_ITEM_STATUS_VARIANTS[status as WorkItemStatus] || 'default';
}

/**
 * Verifica se um status é válido
 */
export function isValidWorkItemStatus(status: string): status is WorkItemStatus {
  return Object.values(WORK_ITEM_STATUS).includes(status as WorkItemStatus);
}
