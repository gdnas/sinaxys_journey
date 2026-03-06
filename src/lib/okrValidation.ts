const TASKISH_VERBS = [
  "criar",
  "lançar",
  "desenvolver",
  "implementar",
  "construir",
  "entregar",
  "publicar",
  "produzir",
  "escrever",
  "documentar",
  "contratar",
  "treinar",
  "definir",
  "executar",
  "fazer",
  "rodar",
  "configurar",
  "automatizar",
];

/**
 * Regras:
 * 1) KR não pode ser tarefa/entregável.
 * 2) Heurística simples: procura verbos de ação típicos de tarefa.
 */
export function validateKrTitlePt(title: string) {
  const t = title.trim();
  if (!t) return "Defina um KR.";

  const lower = t.toLowerCase();

  for (const v of TASKISH_VERBS) {
    const re = new RegExp(`(^|\\s)${v}(\\s|$)`, "i");
    if (re.test(lower)) {
      return `KR parece tarefa ("${v}"). Reescreva como resultado mensurável (ex.: "Reduzir churn de X para Y").`;
    }
  }

  return null;
}

export function clampInt(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

// ============================================================================
// VALIDAÇÕES DE HIERARQUIA OKR - IMPORTADAS DE okrHierarchyValidation.ts
// ============================================================================

export type { 
  ValidateStrategyObjectiveParams,
  ValidateAnnualObjectiveParams,
  ValidateQuarterlyTier1ObjectiveParams,
  ValidateQuarterlyTier2ObjectiveParams,
  ValidateDeliverableParams,
  ValidationError,
  ValidationResult,
} from './okrHierarchyValidation';

export {
  validateStrategyObjective,
  validateAnnualObjective,
  validateQuarterlyTier1Objective,
  validateQuarterlyTier2Objective,
  validateDeliverable,
  validateAllObjectivesInCycle,
  canUserEditDeliverable,
  canUserCreateDeliverable,
  isObjectiveTier1,
  isObjectiveTier2,
  determineObjectiveTier,
} from './okrHierarchyValidation';