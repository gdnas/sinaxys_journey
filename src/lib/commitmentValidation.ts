import {
  acceptancePolicyValues,
  canonicalCommitmentHealthValues,
  canonicalCommitmentPartyRoleValues,
  canonicalizeCommitmentHealth,
  canonicalizeCommitmentPartyRole,
  commitmentBoundaryDefinitions,
  commitmentStatusValues,
  getAllowedCommitmentTransitions,
  type AcceptancePolicy,
  type CanonicalCommitmentHealth,
  type CanonicalCommitmentPartyRole,
  type CommitmentHealth,
  type CommitmentPartyRole,
  type CommitmentStatus,
} from "@/lib/commitmentTypes";
import { canActivateCommitment, requiresOwnerAcceptance, requiresReceiverAcceptance } from "@/lib/commitmentsDomain";

export interface CommitmentValidationIssue {
  code:
    | "missing_owner"
    | "missing_receiver"
    | "dual_primary_receiver"
    | "invalid_transition"
    | "missing_acceptance"
    | "missing_evidence"
    | "terminal_status_mutation"
    | "ambiguous_semantics"
    | "execution_substitutes_commitment"
    | "manual_context_mismatch";
  message: string;
  severity: "error" | "warning";
}

export interface CommitmentAggregateValidationInput {
  status: CommitmentStatus;
  acceptance_policy: AcceptancePolicy;
  primary_owner_user_id?: string | null;
  primary_receiver_user_id?: string | null;
  primary_receiver_team_id?: string | null;
  accepted_by_owner_at?: string | null;
  accepted_by_receiver_at?: string | null;
  evidence_required?: boolean;
  final_evidence_count?: number;
  strategic_context_id?: string | null;
  strategic_context_type?: "objective" | "key_result" | "manual" | null;
  execution_link_count?: number;
}

export interface CommitmentTransitionValidationInput {
  from: CommitmentStatus;
  to: CommitmentStatus;
  acceptance_policy: AcceptancePolicy;
  accepted_by_owner_at?: string | null;
  accepted_by_receiver_at?: string | null;
  evidence_required?: boolean;
  final_evidence_count?: number;
}

export interface CoordinationArtifactSemantics {
  has_explicit_promise: boolean;
  has_named_parties: boolean;
  has_execution_plan: boolean;
  is_atomic_work: boolean;
  is_decision_record: boolean;
  is_checklist_like: boolean;
  is_strategic_goal: boolean;
}

export type CoordinationArtifactKind =
  | "commitment"
  | "project"
  | "work_item"
  | "decision"
  | "checklist"
  | "strategic_context"
  | "ambiguous";

export function normalizeCommitmentHealth(value?: CommitmentHealth | null): CanonicalCommitmentHealth {
  return canonicalizeCommitmentHealth(value);
}

export function normalizeCommitmentPartyRole(value: CommitmentPartyRole): CanonicalCommitmentPartyRole {
  return canonicalizeCommitmentPartyRole(value);
}

export function isCanonicalCommitmentHealth(value: string): value is CanonicalCommitmentHealth {
  return canonicalCommitmentHealthValues.includes(value as CanonicalCommitmentHealth);
}

export function isCanonicalCommitmentPartyRole(value: string): value is CanonicalCommitmentPartyRole {
  return canonicalCommitmentPartyRoleValues.includes(value as CanonicalCommitmentPartyRole);
}

export function isValidCommitmentStatusTransition(from: CommitmentStatus, to: CommitmentStatus) {
  if (from === to) return true;
  return getAllowedCommitmentTransitions(from).includes(to);
}

export function validateCommitmentTransition(input: CommitmentTransitionValidationInput) {
  const issues: CommitmentValidationIssue[] = [];

  if (!commitmentStatusValues.includes(input.from) || !commitmentStatusValues.includes(input.to)) {
    issues.push({
      code: "invalid_transition",
      message: "Status fora da máquina de estados canônica.",
      severity: "error",
    });
    return issues;
  }

  if (!isValidCommitmentStatusTransition(input.from, input.to)) {
    issues.push({
      code: "invalid_transition",
      message: `Transição inválida de ${input.from} para ${input.to}.`,
      severity: "error",
    });
  }

  if (input.to === "active" && !canActivateCommitment(input.acceptance_policy, input.accepted_by_owner_at, input.accepted_by_receiver_at)) {
    issues.push({
      code: "missing_acceptance",
      message: "O compromisso não pode ser ativado antes de cumprir a política de aceite.",
      severity: "error",
    });
  }

  if (input.to === "fulfilled" && input.evidence_required && (input.final_evidence_count ?? 0) < 1) {
    issues.push({
      code: "missing_evidence",
      message: "Cumprimento exige ao menos uma evidência final quando evidence_required = true.",
      severity: "error",
    });
  }

  if ((input.from === "fulfilled" || input.from === "closed_unfulfilled" || input.from === "cancelled") && input.from !== input.to) {
    issues.push({
      code: "terminal_status_mutation",
      message: "Status terminais não devem voltar ao fluxo ativo no modelo canônico.",
      severity: "error",
    });
  }

  return issues;
}

export function validateCommitmentAggregate(input: CommitmentAggregateValidationInput) {
  const issues: CommitmentValidationIssue[] = [];

  if (!input.primary_owner_user_id) {
    issues.push({
      code: "missing_owner",
      message: "Todo compromisso precisa de owner principal explícito.",
      severity: "error",
    });
  }

  if (input.primary_receiver_user_id && input.primary_receiver_team_id) {
    issues.push({
      code: "dual_primary_receiver",
      message: "Use apenas um receiver primário: usuário ou time.",
      severity: "error",
    });
  }

  if (!input.primary_receiver_user_id && !input.primary_receiver_team_id) {
    issues.push({
      code: "missing_receiver",
      message: "No modelo canônico, compromisso sem receiver deve ser exceção operacional explícita.",
      severity: "warning",
    });
  }

  if (requiresOwnerAcceptance(input.acceptance_policy) && !input.accepted_by_owner_at && input.status === "active") {
    issues.push({
      code: "missing_acceptance",
      message: "Owner ainda não aceitou um compromisso já ativo.",
      severity: "error",
    });
  }

  if (requiresReceiverAcceptance(input.acceptance_policy) && !input.accepted_by_receiver_at && input.status === "active") {
    issues.push({
      code: "missing_acceptance",
      message: "Receiver ainda não aceitou um compromisso já ativo.",
      severity: "error",
    });
  }

  if (input.status === "fulfilled" && input.evidence_required && (input.final_evidence_count ?? 0) < 1) {
    issues.push({
      code: "missing_evidence",
      message: "Compromisso cumprido sem evidência final requerida.",
      severity: "error",
    });
  }

  if (input.execution_link_count === 0 && input.status === "active") {
    issues.push({
      code: "execution_substitutes_commitment",
      message: "Compromisso ativo pode existir sem projeto, mas precisa deixar clara sua estratégia de execução futura.",
      severity: "warning",
    });
  }

  if (input.strategic_context_id && input.strategic_context_type === "manual") {
    issues.push({
      code: "manual_context_mismatch",
      message: "strategic_context_id não pode coexistir com strategic_context_type = manual.",
      severity: "error",
    });
  }

  return issues;
}

export function classifyCoordinationArtifact(input: CoordinationArtifactSemantics): CoordinationArtifactKind {
  if (input.is_decision_record) return "decision";
  if (input.is_checklist_like) return "checklist";
  if (input.is_strategic_goal) return "strategic_context";
  if (input.has_explicit_promise && input.has_named_parties) return "commitment";
  if (input.has_execution_plan && !input.is_atomic_work) return "project";
  if (input.is_atomic_work) return "work_item";
  return "ambiguous";
}

export function validateCoordinationArtifactBoundary(input: CoordinationArtifactSemantics) {
  const kind = classifyCoordinationArtifact(input);
  const issues: CommitmentValidationIssue[] = [];

  if (kind === "ambiguous") {
    issues.push({
      code: "ambiguous_semantics",
      message: "O cenário não distingue claramente compromisso, projeto, tarefa, checklist ou decisão.",
      severity: "error",
    });
  }

  if (kind === "project" && input.has_explicit_promise && input.has_named_parties) {
    issues.push({
      code: "execution_substitutes_commitment",
      message: "Projeto não deve substituir o acordo explícito entre partes.",
      severity: "warning",
    });
  }

  return {
    kind,
    issues,
    boundary_reference: commitmentBoundaryDefinitions,
  };
}

export function isSupportedAcceptancePolicy(value: string): value is AcceptancePolicy {
  return acceptancePolicyValues.includes(value as AcceptancePolicy);
}
