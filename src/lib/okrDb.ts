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
  year?: number;
  quarter?: number;
}

export interface DbOkrObjective {
  id: string;
  level: string;
  department_id?: string;
  owner_user_id?: string;
  title: string;
  parent_objective_id?: string;
  cycle_id?: string;
  strategy_objective_id?: string;
  tier?: string | null;
  moderator_user_id?: string | null;
  strategic_reason?: string | null;
  linked_fundamental?: string | null;
  linked_fundamental_text?: string | null;
  due_at?: string | null;
  estimated_value_brl?: number | null;
  estimated_effort_hours?: number | null;
  estimated_cost_brl?: number | null;
  estimated_roi_pct?: number | null;
  expected_profit_brl?: number | null;
  profit_thesis?: string | null;
  expected_revenue_at?: string | null;
  expected_attainment_pct?: number;
}

export interface DbDeliverable {
  id: string;
  key_result_id: string;
  title: string;
  description?: string | null;
  status: string;
  start_date?: string | null;
  due_at?: string | null;
  owner_user_id?: string;
  tier?: string;
  performance_indicator_id?: string | null;
}

export interface DbOkrKeyResult {
  id: string;
  objective_id: string;
  title: string;
  confidence?: 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';
  metric_unit?: string | null;
  start_value?: number | null;
  current_value?: number | null;
  target_value?: number | null;
  kind?: 'METRIC' | 'DELIVERABLE';
}

export interface DbKrChangeLog {
  id: string;
  company_id: string;
  key_result_id: string;
  user_id: string;
  changes: Record<string, { from: any; to: any }>;
  created_at: string;
}

export interface DbStrategyObjective {
  id: string;
  horizon_years: number;
  title: string;
  parent_strategy_objective_id?: string;
  order_index?: number;
  target_year?: number | null;
  linked_fundamental?: 'VISION' | 'FUNDAMENTAL' | null;
}

export interface DbCompanyFundamentals {
  purpose?: string;
  mission?: string;
  vision?: string;
  values?: string;
  culture?: string;
}

export type KrConfidence = 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';
export type KrKind = 'METRIC' | 'DELIVERABLE';

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

export async function listKeyResults(objectiveId: string): Promise<DbOkrKeyResult[]> {
  return [];
}

export async function listDeliverablesByKeyResultIds(krIds: string[]): Promise<DbDeliverable[]> {
  return [];
}

export async function createKeyResult(data: any): Promise<DbOkrKeyResult> {
  return {} as DbOkrKeyResult;
}

export async function createDeliverable(data: any): Promise<DbDeliverable> {
  return {} as DbDeliverable;
}

export async function createOkrObjective(data: any): Promise<DbOkrObjective> {
  return {} as DbOkrObjective;
}

export async function createStrategyObjective(data: any): Promise<DbStrategyObjective> {
  return {} as DbStrategyObjective;
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

export async function updateKeyResult(krId: string, updates: Partial<DbOkrKeyResult>): Promise<void> {
  return;
}

export async function createKrChangeLog(log: Omit<DbKrChangeLog, 'id' | 'created_at'>): Promise<void> {
  return;
}

export async function listKrChangeLogs(krId: string): Promise<DbKrChangeLog[]> {
  return [];
}

export function krProgressPct(kr: DbOkrKeyResult): number | null {
  return null;
}