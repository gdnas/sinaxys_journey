// Tipos de origem de tarefa
export type TaskOrigin = 'project' | 'deliverable' | 'okr' | 'unknown';

export type ObjectiveLevel = 'COMPANY' | 'DEPARTMENT' | 'TEAM';

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
  objective_title?: string;
}

export interface DbTaskWithContextV2 extends DbTaskWithSource {
  objective_id?: string;
  objective_title?: string;
  deliverable_title?: string;
  key_result_title?: string;
  cycle_type?: 'QUARTERLY' | 'YEARLY';
  cycle_quarter?: number;
  cycle_year?: number;
}

export interface DbOkrCycle {
  id: string;
  type: 'QUARTERLY' | 'YEARLY' | 'ANNUAL';
  status: 'ACTIVE' | 'CLOSED';
}

export interface DbOkrObjective {
  id: string;
  level: string;
  department_id?: string;
  owner_user_id?: string;
  title: string;
}

export interface DbOkrKeyResult {
  id: string;
  objective_id: string;
  title: string;
  confidence?: 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';
}

export interface DbStrategyObjective {
  id: string;
  horizon_years: number;
  title: string;
}

export interface DbCompanyFundamentals {
  purpose?: string;
  mission?: string;
  vision?: string;
  values?: string;
  culture?: string;
}

export type KrConfidence = 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';

export type TaskSourceType = 'project' | 'deliverable' | 'okr' | 'unknown';

// Função auxiliar para determinar o tipo de tarefa
export function getTaskSourceType(task: DbTaskWithSource): TaskSourceType {
  if (task.deliverable_id) return 'deliverable';
  if (task.key_result_id) return 'okr';
  if (task.project_id) return 'project';
  return 'unknown';
}

// Funções stub para listagem (TODO: implementar com Supabase)
export async function listOkrCycles(companyId: string): Promise<DbOkrCycle[]> {
  return [];
}

export async function listOkrObjectives(companyId: string, cycleId: string): Promise<DbOkrObjective[]> {
  return [];
}

export async function listStrategyObjectives(companyId: string): Promise<DbStrategyObjective[]> {
  return [];
}

export async function listKeyResultsByObjectiveIds(objectiveIds: string[]): Promise<DbOkrKeyResult[]> {
  return [];
}

export async function getCompanyFundamentals(companyId: string): Promise<DbCompanyFundamentals | null> {
  return null;
}

export async function upsertCompanyFundamentals(companyId: string, fundamentals: Partial<DbCompanyFundamentals>): Promise<void> {
  return;
}

export function krProgressPct(kr: DbOkrKeyResult): number | null {
  return null;
}

export async function listTasksForUser(
  companyId: string,
  userId: string,
  options: { from: string; to: string }
): Promise<DbTaskWithContext[]> {
  return [];
}

export async function listTasksForUserWithContextV2(
  userId: string,
  options: { from: string; to: string }
): Promise<DbTaskWithContextV2[]> {
  return [];
}

export async function listTasksForCompany(
  companyId: string,
  options: { from: string; to: string }
): Promise<DbTaskWithContext[]> {
  return [];
}

export async function listTasksForDepartment(
  companyId: string,
  departmentId: string,
  options: { from: string; to: string }
): Promise<DbTaskWithContext[]> {
  return [];
}

export async function updateTask(taskId: string, updates: any): Promise<void> {
  return;
}

export async function deleteTask(taskId: string): Promise<void> {
  return;
}