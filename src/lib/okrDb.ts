// Tipos de origem de tarefa
export type TaskOrigin = 'project' | 'deliverable' | 'okr' | 'unknown';

export interface DbTaskWithSource {
  id: string;
  title: string;
  status: string;
  priority?: string;
  project_id?: string | null;
  key_result_id?: string | null;
  deliverable_id?: string | null;
  assignee_user_id?: string | null;
  created_by_user_id?: string;
  parent_id?: string | null;
  description?: string | null;
  due_date?: string | null;
  start_date?: string | null;
  estimate_minutes?: number | null;
  checklist?: any;
  completed_at?: string | null;
  created_at?: string;
  updated_at?: string;
  deliverable?: { id: string; title: string } | null;
  key_result?: { id: string; title: string } | null;
  project?: { id: string; name: string } | null;
}

export interface DbTaskWithContext extends DbTaskWithSource {
  objective_id?: string;
}

export type TaskSourceType = 'project' | 'deliverable' | 'okr' | 'unknown';

// Função auxiliar para determinar o tipo de tarefa
export function getTaskSourceType(task: DbTaskWithSource): TaskSourceType {
  if (task.deliverable_id) return 'deliverable';
  if (task.key_result_id) return 'okr';
  if (task.project_id) return 'project';
  return 'unknown';
}