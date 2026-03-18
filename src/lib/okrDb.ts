// Tipos de origem de tarefa
export type TaskOrigin = 'project' | 'deliverable' | 'okr' | 'unknown';

export interface DbTask {
  id: string;
  title: string;
  status: string;
  priority?: string;
  start_date?: string;
  due_date?: string;
  estimate_minutes?: number;
  created_at: string;
  updated_at: string;
  created_by_user_id?: string;
  assigned_to?: string;
  cycle_id?: string;
  parent_task_id?: string;
  description?: string;
  checklist?: any;
}

// Funções stub para o componente (TODO: migrar para o supabase)
export async function listOkrObjectivesByIds(objectiveIds: string[]): Promise<DbOkrObjective[]> {
  return [];
}

export async function listOkrObjectives(companyId: string): Promise<DbOkrObjective[]> {
  return [];
}

export async function listOkrObjectivesByIds(companyId: string): Promise<DbOkrObjective[]> {
  return [];
}