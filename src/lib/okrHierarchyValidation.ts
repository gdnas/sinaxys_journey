/**
 * Validações de Hierarquia de OKRs
 * 
 * Implementa todas as regras de negócio especificadas para a hierarquia OKR:
 * 
 * NÍVEL 1 - Objetivos de Longo Prazo (Strategy Objectives):
 * - Deve sempre existir objetivo de 2 anos
 * - Objetivos de 5 e 10 anos são opcionais
 * - 10 anos alinha-se à visão (VISION)
 * - 5 anos alinha-se ao de 10 anos (parent)
 * - 2 anos alinha-se ao de 5 anos (parent)
 * 
 * NÍVEL 2 - Objetivos Anuais (okr_objectives, ANNUAL):
 * - Responsável principal: empresa toda (não um usuário)
 * - Moderador: admin selecionado em dropdown
 * - Alinham-se ao objetivo de 2 anos (strategy_objective_id)
 * - Regra: 1 para 1 ou muitos para 1
 * - Todo objetivo anual tem pelo menos 1 KR
 * - Cada objetivo tem 1-4 KRs
 * 
 * NÍVEL 3 - Objetivos Trimestrais Estratégicos (TIER 1, QUARTERLY):
 * - Responsável principal: empresa toda
 * - Moderador: admin selecionado em dropdown
 * - Alinham-se a KR anual (via parent_objective_id + okr_kr_objective_links)
 * - Regra: 1 para 1 ou muitos para 1
 * - Todo objetivo tem 1-4 KRs estratégicos
 * - Cada objetivo tem 1-5 PIs (Performance Indicators)
 * 
 * NÍVEL 4 - Objetivos Trimestrais Táticos (TIER 2, QUARTERLY):
 * - Múltiplos responsáveis (heads ou admins)
 * - Múltiplos departamentos envolvidos
 * - Alinham-se a KR estratégico trimestral
 * - Regra: 1 para 1 ou muitos para 1
 * - Todo objetivo tem 1-4 KRs táticos
 * - Cada objetivo tem 1-5 PIs
 * 
 * NÍVEL 5 - Entregáveis (okr_deliverables):
 * - Apenas 1 responsável
 * - Data de início e data prevista para entrega (editáveis com log)
 * - Anexos: links, comentários, documentos, arquivos
 * - Alinham-se a KR tático trimestral
 * - Até 4 níveis de subitens: TASK → LIST → CHECKLIST → CHECKLIST_ITEM
 * - Status: TODO, IN_PROGRESS, DONE (editável pelo usuário)
 * - Colaborador pode editar/apagar entregáveis com seu nome
 * - Colaborador pode criar entregáveis em qualquer KR tático
 */

import type {
  DbStrategyObjective,
  DbOkrObjective,
  DbOkrKeyResult,
  DbPerformanceIndicator,
  DbDeliverable,
  DbTask,
  CycleType,
  ObjectiveLevel,
  DeliverableTier,
  WorkStatus,
} from './okrDb';

import type { DbProfile } from './profilesDb';
import type { DbDepartment } from './departmentsDb';

// ============================================================================
// TIPOS DE VALIDAÇÃO
// ============================================================================

export type ValidationError = {
  field: string;
  message: string;
  code: string;
  severity: 'error' | 'warning';
};

export type ValidationResult = {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
};

// ============================================================================
// NÍVEL 1: VALIDAÇÕES DE OBJETIVOS DE LONGO PRAZO
// ============================================================================

export interface ValidateStrategyObjectiveParams {
  objectives: DbStrategyObjective[];
  objective?: DbStrategyObjective;
  horizonYears: 2 | 5 | 10;
}

export function validateStrategyObjective(params: ValidateStrategyObjectiveParams): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const { objectives, objective, horizonYears } = params;

  // Validação: objetivo de 2 anos é OBRIGATÓRIO
  if (horizonYears === 2) {
    const existing2Year = objectives.find(o => o.horizon_years === 2);
    if (!objective && !existing2Year) {
      errors.push({
        field: 'horizon_years',
        message: 'É obrigatório ter pelo menos um objetivo de 2 anos',
        code: 'MISSING_2_YEAR_OBJECTIVE',
        severity: 'error',
      });
    }
  }

  // Validação: se tem objetivo de 10 anos, deve estar vinculado à visão
  if (objective && objective.horizon_years === 10 && !objective.linked_fundamental) {
    warnings.push({
      field: 'linked_fundamental',
      message: 'Recomendado vincular o objetivo de 10 anos à visão (VISION)',
      code: 'MISSING_VISION_LINK',
      severity: 'warning',
    });
  }

  // Validação: hierarquia de pais
  if (objective) {
    if (objective.horizon_years === 5 && objective.parent_strategy_objective_id) {
      const parent = objectives.find(o => o.id === objective.parent_strategy_objective_id);
      if (parent && parent.horizon_years !== 10) {
        errors.push({
          field: 'parent_strategy_objective_id',
          message: 'Objetivo de 5 anos deve ter como pai um objetivo de 10 anos',
          code: 'INVALID_5_YEAR_PARENT',
          severity: 'error',
        });
      }
    }

    if (objective.horizon_years === 2 && objective.parent_strategy_objective_id) {
      const parent = objectives.find(o => o.id === objective.parent_strategy_objective_id);
      if (parent && parent.horizon_years !== 5) {
        errors.push({
          field: 'parent_strategy_objective_id',
          message: 'Objetivo de 2 anos deve ter como pai um objetivo de 5 anos',
          code: 'INVALID_2_YEAR_PARENT',
          severity: 'error',
        });
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// NÍVEL 2: VALIDAÇÕES DE OBJETIVOS ANUAIS
// ============================================================================

export interface ValidateAnnualObjectiveParams {
  objective?: DbOkrObjective;
  krs: DbOkrKeyResult[];
  objectives2Year: DbStrategyObjective[];
  admins: DbProfile[];
  cycleType?: CycleType;
}

export function validateAnnualObjective(params: ValidateAnnualObjectiveParams): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const { objective, krs, objectives2Year, admins, cycleType } = params;

  if (!objective) {
    return { valid: true, errors: [], warnings: [] };
  }

  // Validação: ciclo deve ser ANNUAL
  if (cycleType && cycleType !== 'ANNUAL') {
    errors.push({
      field: 'cycle_type',
      message: 'Objetivo anual deve estar em um ciclo ANNUAL',
      code: 'INVALID_CYCLE_TYPE',
      severity: 'error',
    });
  }

  // Validação: deve existir objetivo de 2 anos antes de criar objetivos anuais
  const has2YearObjective = objectives2Year.some(o => o.horizon_years === 2);
  if (!has2YearObjective) {
    errors.push({
      field: 'strategy_objective_id',
      message: 'É obrigatório ter um objetivo de 2 anos antes de criar objetivos anuais',
      code: 'MISSING_2_YEAR_OBJECTIVE',
      severity: 'error',
    });
  }

  // Validação: responsável principal deve ser "empresa toda"
  // Na prática, owner_user_id pode ser um admin, mas conceitualmente é a empresa
  // Verificamos se está vinculado ao objetivo de 2 anos
  if (!objective.strategy_objective_id && has2YearObjective) {
    errors.push({
      field: 'strategy_objective_id',
      message: 'Objetivo anual deve estar alinhado ao objetivo de 2 anos',
      code: 'MISSING_2_YEAR_ALIGNMENT',
      severity: 'error',
    });
  }

  // Validação: moderador deve ser admin (recomendado, não obrigatório)
  if (objective.moderator_user_id && admins.length > 0) {
    const isModeratorAdmin = admins.some(a => a.id === objective.moderator_user_id);
    if (!isModeratorAdmin) {
      errors.push({
        field: 'moderator_user_id',
        message: 'Moderador deve ser um usuário com role ADMIN',
        code: 'INVALID_MODERATOR',
        severity: 'error',
      });
    }
  }

  // Validação: deve ter pelo menos 1 KR
  if (krs.length === 0) {
    errors.push({
      field: 'key_results',
      message: 'Objetivo anual deve ter pelo menos 1 resultado-chave',
      code: 'MIN_KRS_REQUIRED',
      severity: 'error',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// NÍVEL 3: VALIDAÇÕES DE OBJETIVOS TRIMESTRAIS ESTRATÉGICOS (TIER 1)
// ============================================================================

export interface ValidateQuarterlyTier1ObjectiveParams {
  objective?: DbOkrObjective;
  krs: DbOkrKeyResult[];
  performanceIndicators: DbPerformanceIndicator[];
  annualKrs: DbOkrKeyResult[];
  linkedAnnualKrId?: string;
  admins: DbProfile[];
  cycleType?: CycleType;
}

export function validateQuarterlyTier1Objective(params: ValidateQuarterlyTier1ObjectiveParams): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const { objective, krs, performanceIndicators, annualKrs, linkedAnnualKrId, admins, cycleType } = params;

  if (!objective) {
    return { valid: true, errors: [], warnings: [] };
  }

  // Validação: ciclo deve ser QUARTERLY
  if (cycleType && cycleType !== 'QUARTERLY') {
    errors.push({
      field: 'cycle_type',
      message: 'Objetivo trimestral deve estar em um ciclo QUARTERLY',
      code: 'INVALID_CYCLE_TYPE',
      severity: 'error',
    });
  }

  // Validação: tier deve ser TIER1
  if (objective.tier !== 'TIER1') {
    errors.push({
      field: 'tier',
      message: 'Objetivo estratégico trimestral deve ser TIER1',
      code: 'INVALID_TIER',
      severity: 'error',
    });
  }

  // Validação: nível deve ser COMPANY
  if (objective.level !== 'COMPANY') {
    errors.push({
      field: 'level',
      message: 'Objetivo estratégico deve ter nível COMPANY (empresa toda)',
      code: 'INVALID_LEVEL',
      severity: 'error',
    });
  }

  // Validação: deve ter vínculo com KR anual
  if (!linkedAnnualKrId) {
    errors.push({
      field: 'parent_objective_id',
      message: 'Objetivo trimestral estratégico deve estar alinhado a um KR anual',
      code: 'MISSING_ANNUAL_KR_LINK',
      severity: 'error',
    });
  }

  // Validação: moderador deve ser admin (obrigatório para TIER 1)
  if (!objective.moderator_user_id) {
    errors.push({
      field: 'moderator_user_id',
      message: 'Objetivo trimestral estratégico deve ter um moderador (usuário ADMIN)',
      code: 'MISSING_MODERATOR',
      severity: 'error',
    });
  } else if (admins.length > 0) {
    const isModeratorAdmin = admins.some(a => a.id === objective.moderator_user_id);
    if (!isModeratorAdmin) {
      errors.push({
        field: 'moderator_user_id',
        message: 'Moderador deve ser um usuário com role ADMIN',
        code: 'INVALID_MODERATOR',
        severity: 'error',
      });
    }
  }

  // Validação: deve ter pelo menos 1 KR
  if (krs.length === 0) {
    errors.push({
      field: 'key_results',
      message: 'Objetivo trimestral estratégico deve ter pelo menos 1 resultado-chave',
      code: 'MIN_KRS_REQUIRED',
      severity: 'error',
    });
  }

  // Validação: máximo de 5 KRs (alterado de 4 para 5)
  if (krs.length > 5) {
    errors.push({
      field: 'key_results',
      message: 'Objetivo trimestral estratégico pode ter no máximo 5 resultados-chave',
      code: 'MAX_KRS_EXCEEDED',
      severity: 'error',
    });
  }

  // Validação: máximo de 5 Performance Indicators
  if (performanceIndicators.length > 5) {
    errors.push({
      field: 'performance_indicators',
      message: 'Objetivo trimestral estratégico pode ter no máximo 5 indicadores de performance',
      code: 'MAX_PIS_EXCEEDED',
      severity: 'error',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// NÍVEL 4: VALIDAÇÕES DE OBJETIVOS TRIMESTRAIS TÁTICOS (TIER 2)
// ============================================================================

export interface ValidateQuarterlyTier2ObjectiveParams {
  objective?: DbOkrObjective;
  krs: DbOkrKeyResult[];
  performanceIndicators: DbPerformanceIndicator[];
  quarterlyStrategicKrs: DbOkrKeyResult[];
  linkedStrategicKrId?: string;
  departmentIds: string[];
  ownerUserIds: string[];
  admins: DbProfile[];
  heads: DbProfile[];
  cycleType?: CycleType;
}

export function validateQuarterlyTier2Objective(params: ValidateQuarterlyTier2ObjectiveParams): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const { objective, krs, performanceIndicators, quarterlyStrategicKrs, linkedStrategicKrId, departmentIds, ownerUserIds, admins, heads, cycleType } = params;

  if (!objective) {
    return { valid: true, errors: [], warnings: [] };
  }

  // Validação: ciclo deve ser QUARTERLY
  if (cycleType && cycleType !== 'QUARTERLY') {
    errors.push({
      field: 'cycle_type',
      message: 'Objetivo trimestral deve estar em um ciclo QUARTERLY',
      code: 'INVALID_CYCLE_TYPE',
      severity: 'error',
    });
  }

  // Validação: tier deve ser TIER2
  if (objective.tier !== 'TIER2') {
    errors.push({
      field: 'tier',
      message: 'Objetivo tático trimestral deve ser TIER2',
      code: 'INVALID_TIER',
      severity: 'error',
    });
  }

  // Validação: nível deve ser DEPARTMENT
  if (objective.level !== 'DEPARTMENT') {
    errors.push({
      field: 'level',
      message: 'Objetivo tático deve ter nível DEPARTMENT',
      code: 'INVALID_LEVEL',
      severity: 'error',
    });
  }

  // Validação: deve ter pelo menos 1 departamento
  if (departmentIds.length === 0) {
    errors.push({
      field: 'departments',
      message: 'Objetivo tático deve ter pelo menos 1 departamento envolvido',
      code: 'MIN_DEPARTMENTS_REQUIRED',
      severity: 'error',
    });
  }

  // Validação: deve ter pelo menos 1 responsável
  if (ownerUserIds.length === 0) {
    errors.push({
      field: 'owner_user_ids',
      message: 'Objetivo tático deve ter pelo menos 1 responsável',
      code: 'MIN_OWNERS_REQUIRED',
      severity: 'error',
    });
  }

  // Validação: responsáveis devem ser heads ou admins
  const allPotentialOwners = [...heads, ...admins];
  const validOwners = ownerUserIds.filter(id => 
    allPotentialOwners.some(u => u.id === id)
  );
  
  if (validOwners.length !== ownerUserIds.length) {
    const invalidOwnerIds = ownerUserIds.filter(id => 
      !allPotentialOwners.some(u => u.id === id)
    );
    errors.push({
      field: 'owner_user_ids',
      message: `Responsáveis devem ser heads ou admins. Usuários inválidos: ${invalidOwnerIds.length}`,
      code: 'INVALID_OWNERS',
      severity: 'error',
    });
  }

  // Validação: deve ter vínculo com KR estratégico trimestral
  if (!linkedStrategicKrId) {
    errors.push({
      field: 'parent_objective_id',
      message: 'Objetivo tático deve estar alinhado a um KR estratégico trimestral',
      code: 'MISSING_STRATEGIC_KR_LINK',
      severity: 'error',
    });
  }

  // Validação: deve ter pelo menos 1 KR
  if (krs.length === 0) {
    errors.push({
      field: 'key_results',
      message: 'Objetivo tático deve ter pelo menos 1 resultado-chave',
      code: 'MIN_KRS_REQUIRED',
      severity: 'error',
    });
  }

  // Validação: máximo de 5 KRs (alterado de 4 para 5)
  if (krs.length > 5) {
    errors.push({
      field: 'key_results',
      message: 'Objetivo tático pode ter no máximo 5 resultados-chave',
      code: 'MAX_KRS_EXCEEDED',
      severity: 'error',
    });
  }

  // Validação: máximo de 5 Performance Indicators
  if (performanceIndicators.length > 5) {
    errors.push({
      field: 'performance_indicators',
      message: 'Objetivo tático pode ter no máximo 5 indicadores de performance',
      code: 'MAX_PIS_EXCEEDED',
      severity: 'error',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// NÍVEL 5: VALIDAÇÕES DE ENTREGÁVEIS (DELIVERABLES)
// ============================================================================

export interface ValidateDeliverableParams {
  deliverable?: DbDeliverable;
  tacticalKrs: DbOkrKeyResult[];
  tasks: DbTask[];
  currentUserCanEdit?: boolean;
  currentUserId?: string;
}

export function validateDeliverable(params: ValidateDeliverableParams): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const { deliverable, tacticalKrs, tasks, currentUserCanEdit, currentUserId } = params;

  if (!deliverable) {
    return { valid: true, errors: [], warnings: [] };
  }

  // Validação: deve estar vinculado a um KR tático
  const krExists = tacticalKrs.some(kr => kr.id === deliverable.key_result_id);
  if (!krExists) {
    errors.push({
      field: 'key_result_id',
      message: 'Entregável deve estar vinculado a um KR tático trimestral',
      code: 'MISSING_TACTICAL_KR_LINK',
      severity: 'error',
    });
  }

  // Validação: status válido
  const validStatuses: WorkStatus[] = ['TODO', 'IN_PROGRESS', 'DONE'];
  if (!validStatuses.includes(deliverable.status)) {
    errors.push({
      field: 'status',
      message: 'Status inválido. Deve ser TODO, IN_PROGRESS ou DONE',
      code: 'INVALID_STATUS',
      severity: 'error',
    });
  }

  // Validação: se data de início existe, não pode ser posterior à data de entrega
  if (deliverable.start_date && deliverable.due_at) {
    const startDate = new Date(deliverable.start_date);
    const dueDate = new Date(deliverable.due_at);
    if (startDate > dueDate) {
      errors.push({
        field: 'start_date',
        message: 'Data de início não pode ser posterior à data prevista de entrega',
        code: 'INVALID_DATE_RANGE',
        severity: 'error',
      });
    }
  }

  // Validação: profundidade de tarefas (máximo 4 níveis)
  let maxDepth = 0;
  const checkTaskDepth = (taskId: string, currentDepth: number): void => {
    maxDepth = Math.max(maxDepth, currentDepth);
    if (currentDepth >= 4) return; // Limite atingido

    const childTasks = tasks.filter(t => t.parent_task_id === taskId);
    childTasks.forEach(child => {
      checkTaskDepth(child.id, currentDepth + 1);
    });
  };

  const rootTasks = tasks.filter(t => !t.parent_task_id);
  rootTasks.forEach(task => {
    checkTaskDepth(task.id, 0);
  });

  if (maxDepth > 3) { // depth 0, 1, 2, 3 = 4 níveis
    errors.push({
      field: 'task_hierarchy',
      message: 'Entregável pode ter no máximo 4 níveis de subitens (TASK → LIST → CHECKLIST → CHECKLIST_ITEM)',
      code: 'MAX_TASK_DEPTH_EXCEEDED',
      severity: 'error',
    });
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}

// ============================================================================
// HELPER: VERIFICAR SE USUÁRIO PODE EDITAR ENTREGÁVEL
// ============================================================================

export function canUserEditDeliverable(
  deliverable: DbDeliverable,
  userId: string,
  userRole: string,
  isOwnerOrAdmin: boolean
): boolean {
  // Dono do entregável pode editar
  if (deliverable.owner_user_id === userId) {
    return true;
  }

  // Admin ou dono do objetivo pode editar
  if (isOwnerOrAdmin) {
    return true;
  }

  return false;
}

// ============================================================================
// HELPER: VERIFICAR SE USUÁRIO PODE APAGAR ENTREGÁVEL
// ============================================================================

export function canUserDeleteDeliverable(
  deliverable: DbDeliverable,
  userId: string,
  userRole: string,
  isOwnerOrAdmin: boolean
): boolean {
  // Dono do entregável pode apagar
  if (deliverable.owner_user_id === userId) {
    return true;
  }

  // Admin pode apagar qualquer entregável
  if (isOwnerOrAdmin) {
    return true;
  }

  return false;
}

// ============================================================================
// HELPER: VERIFICAR SE USUÁRIO PODE CRIAR ENTREGÁVEL
// ============================================================================

export function canUserCreateDeliverable(
  krOwnerId: string | null,
  userId: string,
  isOwnerOrAdmin: boolean
): boolean {
  // Dono do KR pode criar entregável
  if (krOwnerId === userId) {
    return true;
  }

  // Admin pode criar entregável em qualquer KR tático
  if (isOwnerOrAdmin) {
    return true;
  }

  return false;
}

// ============================================================================
// HELPER: VERIFICAR SE OBJETIVO É TIER 1 OU TIER 2
// ============================================================================

export function isObjectiveTier1(objective: DbOkrObjective): boolean {
  return objective.tier === 'TIER1';
}

export function isObjectiveTier2(objective: DbOkrObjective): boolean {
  return objective.tier === 'TIER2';
}

// ============================================================================
// HELPER: DETERMINAR TIER AUTOMATICAMENTE
// ============================================================================

export function determineObjectiveTier(
  objective: DbOkrObjective,
  parentObjective?: DbOkrObjective | null
): DeliverableTier {
  // Se já tem tier definido, usa ele
  if (objective.tier === 'TIER1' || objective.tier === 'TIER2') {
    return objective.tier;
  }

  // Tier 2: vinculado a objetivo estratégico (via parent)
  if (objective.parent_objective_id && parentObjective) {
    // Se o pai é estratégico, este é tático (Tier 2)
    return 'TIER2';
  }

  // Tier 1: por padrão
  return 'TIER1';
}

// ============================================================================
// EXPORTAÇÃO DE FUNÇÕES DE VALIDAÇÃO COMPOSTAS
// ============================================================================

export function validateAllObjectivesInCycle(
  objectives: DbOkrObjective[],
  cycleType: CycleType,
  admins: DbProfile[],
  heads: DbProfile[]
): { valid: boolean; objectiveErrors: Map<string, ValidationError[]> } {
  const objectiveErrors = new Map<string, ValidationError[]>();
  let allValid = true;

  objectives.forEach(objective => {
    if (cycleType === 'ANNUAL') {
      // Validação de objetivo anual
      const result = validateAnnualObjective({
        objective,
        krs: [], // Será preenchido externamente
        objectives2Year: [], // Será preenchido externamente
        admins,
        cycleType,
      });
      
      if (!result.valid) {
        allValid = false;
        objectiveErrors.set(objective.id, result.errors);
      }
    } else if (cycleType === 'QUARTERLY') {
      // Validação de objetivo trimestral
      const result = objective.tier === 'TIER1'
        ? validateQuarterlyTier1Objective({
            objective,
            krs: [], // Será preenchido externamente
            performanceIndicators: [],
            annualKrs: [],
            admins,
            cycleType,
          })
        : validateQuarterlyTier2Objective({
            objective,
            krs: [],
            performanceIndicators: [],
            quarterlyStrategicKrs: [],
            departmentIds: objective.department_id ? [objective.department_id] : [],
            ownerUserIds: objective.owner_user_id ? [objective.owner_user_id] : [],
            admins,
            heads,
            cycleType,
          });

      if (!result.valid) {
        allValid = false;
        objectiveErrors.set(objective.id, result.errors);
      }
    }
  });

  return { valid: allValid, objectiveErrors };
}