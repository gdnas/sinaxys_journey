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
  owner_user_id?: string;
}

export type TaskLevelType = 'TASK' | 'SUBTASK';
export type TaskSourceType = 'project' | 'deliverable' | 'okr';

export interface DbTaskWithSource extends DbTask {
  source_type?: TaskSourceType;
  source_name?: string;
}

export type DbTaskWithContext = DbTaskWithSource & {
  deliverable_id?: string;
  objective_id?: string;
  objective_title?: string;
  objective_level?: string;
  department_id?: string;
};

export type DbTaskWithContextV2 = DbTaskWithContext & {
  deliverable_title?: string;
  key_result_id?: string;
  key_result_title?: string;
  key_result_kind?: string;
  cycle_id?: string;
  cycle_type?: string;
  cycle_year?: number;
  cycle_quarter?: number;
};

// OKR Objective types
export type ObjectiveLevel = 'COMPANY' | 'DEPARTMENT';
export type CycleType = 'ANNUAL' | 'QUARTERLY';
export type CycleStatus = 'ACTIVE' | 'ARCHIVED' | 'DRAFT';
export type WorkStatus = 'TODO' | 'IN_PROGRESS' | 'DONE' | 'BLOCKED';
export type KrKind = 'METRIC' | 'DELIVERABLE';
export type KrConfidence = 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';
export type PiKind = 'METRIC' | 'BINARY';
export type PiConfidence = 'ON_TRACK' | 'AT_RISK' | 'OFF_TRACK';
export type DeliverableTier = 'TIER1' | 'TIER2' | 'TIER3';

export interface DbOkrObjective {
  id: string;
  company_id: string;
  cycle_id: string;
  parent_objective_id?: string;
  level: ObjectiveLevel;
  department_id?: string;
  owner_user_id: string;
  title: string;
  description?: string;
  strategic_reason?: string;
  linked_fundamental?: string;
  linked_fundamental_text?: string;
  due_at?: string;
  updated_at: string;
  created_at: string;
  estimated_value_brl?: number;
  estimated_effort_hours?: number;
  estimated_cost_brl?: number;
  estimated_roi_pct?: number;
  expected_attainment_pct?: number;
  status: string;
  achieved_pct?: number;
  achieved_at?: string;
  strategy_objective_id?: string;
  head_performance_score?: number;
  head_performance_notes?: string;
  head_performance_reviewed_at?: string;
  head_user_id?: string;
  expected_impact_type?: string;
  expected_impact_notes?: string;
  expected_revenue_at?: string;
  expected_profit_brl?: number;
  profit_thesis?: string;
  moderator_user_id?: string;
  tier: string;
  okr_level: string;
  parent_cycle_id?: string;
}

export interface DbOkrKeyResult {
  id: string;
  objective_id: string;
  title: string;
  metric_unit?: string;
  start_value?: number;
  target_value?: number;
  current_value?: number;
  owner_user_id?: string;
  confidence: KrConfidence;
  updated_at: string;
  created_at: string;
  due_at?: string;
  achieved: boolean;
  achieved_at?: string;
  estimated_value_brl?: number;
  estimated_cost_brl?: number;
  estimated_roi_pct?: number;
  kind: KrKind;
  description?: string;
}

export interface DbOkrCycle {
  id: string;
  company_id: string;
  type: CycleType;
  year: number;
  quarter?: number;
  start_date?: string;
  end_date?: string;
  status: CycleStatus;
  name?: string;
  updated_at: string;
  created_at: string;
  parent_cycle_id?: string;
}

export interface DbStrategyObjective {
  id: string;
  company_id: string;
  horizon_years: number;
  title: string;
  description?: string;
  growth_levers?: string;
  structuring_projects?: string;
  bets_and_expansions?: string;
  order_index: number;
  created_by_user_id?: string;
  updated_at: string;
  created_at: string;
  owner_user_id?: string;
  target_year?: number;
  parent_strategy_objective_id?: string;
  linked_fundamental?: string;
}

export interface DbDeliverable {
  id: string;
  key_result_id: string;
  tier: string;
  title: string;
  description?: string;
  owner_user_id?: string;
  status: WorkStatus;
  due_at?: string;
  updated_at: string;
  created_at: string;
  start_date: string;
  performance_indicator_id?: string;
  task_hierarchy?: any;
  date_change_log?: any[];
  department_id?: string;
}

export interface DbDeliverableAttachment {
  id: string;
  deliverable_id: string;
  type: string;
  url?: string;
  description?: string;
  file_name?: string;
  file_size?: number;
  file_type?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DbDeliverableComment {
  id: string;
  deliverable_id: string;
  text: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DbDeliverableDateLog {
  id: string;
  deliverable_id: string;
  previous_date?: string;
  new_date: string;
  changed_by_user_id: string;
  reason?: string;
  created_at: string;
}

export interface DbPerformanceIndicator {
  id: string;
  objective_id: string;
  title: string;
  kind: PiKind;
  metric_unit?: string;
  start_value?: number;
  target_value?: number;
  current_value?: number;
  due_at?: string;
  achieved?: boolean;
  achieved_at?: string;
  confidence: PiConfidence;
  created_at: string;
  updated_at: string;
}

export interface DbCompanyFundamentals {
  company_id: string;
  mission?: string;
  vision?: string;
  purpose?: string;
  values?: string;
  culture?: string;
  strategic_north?: string;
  annual_drivers?: string;
  updated_at: string;
  created_at: string;
}

export interface DbKrChangeLog {
  id: string;
  company_id: string;
  key_result_id: string;
  user_id: string;
  changes: any;
  created_at: string;
}

// Type aliases for consistency
export type DbOkrs = DbOkrObjective[];
export type DbKeyResults = DbOkrKeyResult[];
export type DbCycles = DbOkrCycle[];
export type DbStrategyObjectives = DbStrategyObjective[];

// Funções stub para o componente (TODO: migrar para o supabase)
export async function listOkrObjectivesByIds(objectiveIds: string[]): Promise<DbOkrObjective[]> {
  return [];
}

export async function listOkrObjectives(companyId: string): Promise<DbOkrObjective[]> {
  return [];
}

export async function listOkrObjectivesByCycle(companyId: string, cycleId: string): Promise<DbOkrObjective[]> {
  return [];
}

export async function listKeyResults(objectiveId?: string): Promise<DbOkrKeyResult[]> {
  return [];
}

export async function listKeyResultsByObjectiveIds(objectiveIds: string[]): Promise<DbOkrKeyResult[]> {
  return [];
}

export async function listOkrCycles(companyId: string): Promise<DbOkrCycle[]> {
  return [];
}

export async function listDeliverablesByKeyResultIds(keyResultIds: string[]): Promise<DbDeliverable[]> {
  return [];
}

export async function listDeliverables(objectiveId: string): Promise<DbDeliverable[]> {
  return [];
}

export async function listDeliverableDateHistory(deliverableId: string): Promise<DbDeliverableDateLog[]> {
  return [];
}

export async function listStrategyObjectives(companyId: string): Promise<DbStrategyObjective[]> {
  return [];
}

export async function listPerformanceIndicators(objectiveId: string): Promise<DbPerformanceIndicator[]> {
  return [];
}

export async function listTasksByDeliverableIds(deliverableIds: string[]): Promise<DbTask[]> {
  return [];
}

export async function listTasksForCompany(companyId: string, from?: string, to?: string): Promise<DbTaskWithContext[]> {
  return [];
}

export async function listTasksForDepartment(companyId: string, departmentId: string, from?: string, to?: string): Promise<DbTaskWithContext[]> {
  return [];
}

export async function listTasksForUser(userId: string, from?: string, to?: string): Promise<DbTaskWithContext[]> {
  return [];
}

export async function listTasksForUserWithContext(userId: string, from?: string, to?: string): Promise<DbTaskWithContextV2[]> {
  return [];
}

export async function listOkrObjectivesForOwner(companyId: string, ownerId: string): Promise<DbOkrObjective[]> {
  return [];
}

export async function listKrChangeLogs(keyResultId: string): Promise<DbKrChangeLog[]> {
  return [];
}

export async function getOkrObjective(objectiveId: string): Promise<DbOkrObjective | null> {
  return null;
}

export async function getCompanyFundamentals(companyId: string): Promise<DbCompanyFundamentals | null> {
  return null;
}

// CRUD operations
export async function createOkrObjective(data: Partial<DbOkrObjective>): Promise<DbOkrObjective> {
  return {} as DbOkrObjective;
}

export async function createKeyResult(data: Partial<DbOkrKeyResult>): Promise<DbOkrKeyResult> {
  return {} as DbOkrKeyResult;
}

export async function createOkrCycle(data: Partial<DbOkrCycle>): Promise<DbOkrCycle> {
  return {} as DbOkrCycle;
}

export async function createDeliverable(data: Partial<DbDeliverable>): Promise<DbDeliverable> {
  return {} as DbDeliverable;
}

export async function createStrategyObjective(data: Partial<DbStrategyObjective>): Promise<DbStrategyObjective> {
  return {} as DbStrategyObjective;
}

export async function createPerformanceIndicator(data: Partial<DbPerformanceIndicator>): Promise<DbPerformanceIndicator> {
  return {} as DbPerformanceIndicator;
}

export async function createTask(data: Partial<DbTask>): Promise<DbTask> {
  return {} as DbTask;
}

export async function createTaskWithParent(data: Partial<DbTask>): Promise<DbTask> {
  return {} as DbTask;
}

export async function updateOkrObjective(id: string, data: Partial<DbOkrObjective>): Promise<DbOkrObjective> {
  return {} as DbOkrObjective;
}

export async function updateKeyResult(id: string, data: Partial<DbOkrKeyResult>): Promise<DbOkrKeyResult> {
  return {} as DbOkrKeyResult;
}

export async function updateDeliverable(id: string, data: Partial<DbDeliverable>): Promise<DbDeliverable> {
  return {} as DbDeliverable;
}

export async function updateDeliverableWithDates(id: string, data: Partial<DbDeliverable>): Promise<DbDeliverable> {
  return {} as DbDeliverable;
}

export async function updateStrategyObjective(id: string, data: Partial<DbStrategyObjective>): Promise<DbStrategyObjective> {
  return {} as DbStrategyObjective;
}

export async function updatePerformanceIndicator(id: string, data: Partial<DbPerformanceIndicator>): Promise<DbPerformanceIndicator> {
  return {} as DbPerformanceIndicator;
}

export async function updateTask(id: string, data: Partial<DbTask>): Promise<DbTask> {
  return {} as DbTask;
}

export async function deleteTask(id: string): Promise<void> {
  return;
}

export async function deleteDeliverable(id: string): Promise<void> {
  return;
}

export async function deleteOkrObjectiveCascade(id: string): Promise<void> {
  return;
}

export async function deleteKeyResultCascade(id: string): Promise<void> {
  return;
}

export async function deleteStrategyObjective(id: string): Promise<void> {
  return;
}

export async function deletePerformanceIndicator(id: string): Promise<void> {
  return;
}

export async function createKrChangeLog(data: Partial<DbKrChangeLog>): Promise<DbKrChangeLog> {
  return {} as DbKrChangeLog;
}

export async function upsertCompanyFundamentals(companyId: string, data: Partial<DbCompanyFundamentals>): Promise<DbCompanyFundamentals> {
  return {} as DbCompanyFundamentals;
}

export async function ensureOkrCycle(companyId: string, type: CycleType, year: number, quarter?: number): Promise<DbOkrCycle> {
  return {} as DbOkrCycle;
}

export async function syncObjectiveDepartments(objectiveId: string, departmentIds: string[]): Promise<void> {
  return;
}

export async function togglePerformanceIndicatorAchieved(id: string, achieved: boolean): Promise<DbPerformanceIndicator> {
  return {} as DbPerformanceIndicator;
}

// Progress calculation utilities
export function krProgressPct(kr: DbOkrKeyResult): number {
  if (!kr.target_value || kr.target_value === 0) return 0;
  const progress = ((kr.current_value || 0) - (kr.start_value || 0)) / (kr.target_value - (kr.start_value || 0));
  return Math.min(Math.max(progress * 100, 0), 100);
}

export function piProgressPct(pi: DbPerformanceIndicator): number {
  if (!pi.target_value || pi.target_value === 0) return 0;
  const progress = ((pi.current_value || 0) - (pi.start_value || 0)) / (pi.target_value - (pi.start_value || 0));
  return Math.min(Math.max(progress * 100, 0), 100);
}

// Legacy / compatibility exports
export type DbTaskLegacy = DbTask;
export type DbDeliverableLegacy = DbDeliverable;

// UI Helper types
export const ObjectiveLevelLabel: Record<ObjectiveLevel, string> = {
  COMPANY: 'Empresa',
  DEPARTMENT: 'Departamento'
};

export const objectiveTypeLabel = (level: ObjectiveLevel): string => {
  if (level === 'COMPANY') {
    return 'Empresa';
  }
  return level === 'DEPARTMENT' ? 'Departamento' : 'Empresa';
};

export const objectiveTypeBadgeClass = (level: ObjectiveLevel): string => {
  if (level === 'COMPANY') {
    return 'bg-blue-100 text-blue-900 hover:bg-blue-200';
  }
  return 'bg-purple-100 text-purple-900 hover:bg-purple-200';
};

export const CycleTypeLabel = (type: CycleType): string => {
  if (type === 'ANNUAL') {
    return 'Anual';
  }
  return 'Trimestral';
};

export const CycleStatusLabel = (status: CycleStatus): string => {
  if (status === 'ACTIVE') {
    return 'Ativo';
  }
  return status === 'ARCHIVED' ? 'Arquivado' : 'Rascunho';
};

export const KrKindLabel = (kind: KrKind): string => {
  if (kind === 'DELIVERABLE') {
    return 'Entregável';
  }
  return 'Métrico';
};

export const KrConfidenceLabel = (confidence: KrConfidence): string => {
  if (confidence === 'ON_TRACK') {
    return 'No rastro';
  }
  return 'Em risco';
};