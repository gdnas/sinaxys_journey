import { z } from "zod";
import {
  acceptancePolicyValues,
  canonicalCommitmentHealthValues,
  canonicalizeCommitmentHealth,
  canonicalizeCommitmentPartyRole,
  commitmentCategoryValues,
  commitmentHealthValues,
  commitmentPartyRoleValues,
  commitmentPartyTypeValues,
  commitmentPriorityValues,
  commitmentStatusValues,
  commitmentTypeValues,
  decisionStatusValues,
  decisionTypeValues,
  dependencyKindValues,
  dependencyStatusValues,
  dependencyTargetTypeValues,
  evidenceTypeValues,
  executionLinkRoleValues,
  executionLinkTargetTypeValues,
  getAllowedCommitmentTransitions,
  isCommitmentTerminalStatus,
  reviewStatusValues,
  strategicContextTypeValues,
  type AcceptancePolicy,
  type CanonicalCommitmentHealth,
  type CommitmentCategory,
  type CommitmentHealth,
  type CommitmentPartyRole,
  type CommitmentPartyType,
  type CommitmentPriority,
  type CommitmentStatus,
  type CommitmentType,
  type DecisionStatus,
  type DecisionType,
  type DependencyKind,
  type DependencyStatus,
  type DependencyTargetType,
  type EvidenceType,
  type ExecutionLinkRole,
  type ExecutionLinkTargetType,
  type ReviewStatus,
  type StrategicContextType,
} from "@/lib/commitmentTypes";

export {
  acceptancePolicyValues,
  canonicalCommitmentHealthValues,
  commitmentCategoryValues,
  commitmentHealthValues,
  commitmentPartyRoleValues,
  commitmentPartyTypeValues,
  commitmentPriorityValues,
  commitmentStatusValues,
  commitmentTypeValues,
  decisionStatusValues,
  decisionTypeValues,
  dependencyKindValues,
  dependencyStatusValues,
  dependencyTargetTypeValues,
  evidenceTypeValues,
  executionLinkRoleValues,
  executionLinkTargetTypeValues,
  reviewStatusValues,
  strategicContextTypeValues,
} from "@/lib/commitmentTypes";

export type {
  AcceptancePolicy,
  CanonicalCommitmentHealth,
  CommitmentCategory,
  CommitmentHealth,
  CommitmentPartyRole,
  CommitmentPartyType,
  CommitmentPriority,
  CommitmentStatus,
  CommitmentType,
  DecisionStatus,
  DecisionType,
  DependencyKind,
  DependencyStatus,
  DependencyTargetType,
  EvidenceType,
  ExecutionLinkRole,
  ExecutionLinkTargetType,
  ReviewStatus,
  StrategicContextType,
} from "@/lib/commitmentTypes";

const optionalText = z.string().trim().min(1).nullish().transform((value) => value ?? null);
const optionalUuid = z.string().uuid().nullish().transform((value) => value ?? null);
const optionalTimestamp = z.string().trim().min(1).nullish().transform((value) => value ?? null);

const commitmentHealthSchema = z
  .enum(commitmentHealthValues)
  .optional()
  .default("unknown")
  .transform((value) => canonicalizeCommitmentHealth(value));

const commitmentPartyRoleSchema = z
  .enum(commitmentPartyRoleValues)
  .transform((value) => canonicalizeCommitmentPartyRole(value));

export const terminalCommitmentStatuses = new Set<CommitmentStatus>([
  "fulfilled",
  "closed_unfulfilled",
  "cancelled",
]);

export const commitmentPartyInputSchema = z
  .object({
    party_type: z.enum(commitmentPartyTypeValues),
    user_id: optionalUuid,
    team_id: optionalUuid,
    role: commitmentPartyRoleSchema,
    is_primary: z.boolean().optional().default(false),
    acceptance_required: z.boolean().optional().default(false),
    accepted_at: optionalTimestamp,
    declined_at: optionalTimestamp,
    active: z.boolean().optional().default(true),
  })
  .superRefine((value, ctx) => {
    if (value.party_type === "user" && !value.user_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "user_id é obrigatório quando party_type = user." });
    }
    if (value.party_type === "team" && !value.team_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "team_id é obrigatório quando party_type = team." });
    }
    if (value.party_type === "user" && value.team_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "team_id não pode coexistir com party_type = user." });
    }
    if (value.party_type === "team" && value.user_id) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "user_id não pode coexistir com party_type = team." });
    }
  });

const createCommitmentInputBaseSchema = z.object({
  tenant_id: z.string().uuid(),
  title: z.string().trim().min(1),
  description: optionalText,
  purpose: z.string().trim().min(1),
  scope_summary: optionalText,
  success_criteria: optionalText,
  conditions_of_satisfaction: optionalText,
  category: z.enum(commitmentCategoryValues),
  commitment_type: z.enum(commitmentTypeValues),
  status: z.enum(commitmentStatusValues).optional(),
  health: commitmentHealthSchema,
  confidence_level: optionalText,
  priority: z.enum(commitmentPriorityValues).optional().default("medium"),
  acceptance_policy: z.enum(acceptancePolicyValues).optional().default("receiver_only"),
  evidence_required: z.boolean().optional().default(false),
  review_cadence: optionalText,
  strategic_context_id: optionalUuid,
  strategic_context_type: z.enum(strategicContextTypeValues).optional().default("manual"),
  origin_decision_id: optionalUuid,
  primary_owner_user_id: z.string().uuid(),
  primary_receiver_user_id: optionalUuid,
  primary_receiver_team_id: optionalUuid,
  review_owner_id: optionalUuid,
  start_date: optionalTimestamp,
  due_date: optionalTimestamp,
  next_review_at: optionalTimestamp,
  closed_reason: optionalText,
  created_by: z.string().uuid(),
  parties: z.array(commitmentPartyInputSchema).optional().default([]),
});

export const createCommitmentInputSchema = createCommitmentInputBaseSchema.superRefine((value, ctx) => {
  if (value.primary_receiver_user_id && value.primary_receiver_team_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Use apenas um receiver primário: usuário ou time.",
      path: ["primary_receiver_user_id"],
    });
  }

  const receiverOptional = value.commitment_type === "self_commitment" || value.category === "operational";
  if (!receiverOptional && !value.primary_receiver_user_id && !value.primary_receiver_team_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Compromissos canônicos precisam de receiver explícito, exceto auto-compromissos operacionais.",
      path: ["primary_receiver_user_id"],
    });
  }

  if (value.strategic_context_id && value.strategic_context_type === "manual") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Quando strategic_context_id existir, strategic_context_type não pode ser manual.",
      path: ["strategic_context_type"],
    });
  }

  if (!value.strategic_context_id && value.strategic_context_type !== "manual") {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Use strategic_context_type = manual quando não houver vínculo estratégico explícito.",
      path: ["strategic_context_type"],
    });
  }
});

export const updateCommitmentInputSchema = createCommitmentInputBaseSchema
  .omit({ tenant_id: true, created_by: true, parties: true, primary_owner_user_id: true })
  .partial();

export type CommitmentPartyInput = z.infer<typeof commitmentPartyInputSchema>;
export type CreateCommitmentInput = z.infer<typeof createCommitmentInputSchema>;
export type UpdateCommitmentInput = z.infer<typeof updateCommitmentInputSchema>;

export function isTerminalCommitmentStatus(status: CommitmentStatus) {
  return terminalCommitmentStatuses.has(status) || isCommitmentTerminalStatus(status);
}

export function requiresOwnerAcceptance(policy: AcceptancePolicy) {
  return policy === "owner_only" || policy === "bilateral";
}

export function requiresReceiverAcceptance(policy: AcceptancePolicy) {
  return policy === "receiver_only" || policy === "bilateral";
}

export function canActivateCommitment(
  policy: AcceptancePolicy,
  acceptedByOwnerAt?: string | null,
  acceptedByReceiverAt?: string | null,
) {
  if (policy === "none") return true;
  if (policy === "owner_only") return Boolean(acceptedByOwnerAt);
  if (policy === "receiver_only") return Boolean(acceptedByReceiverAt);
  return Boolean(acceptedByOwnerAt && acceptedByReceiverAt);
}

export function deriveInitialCommitmentStatus(policy: AcceptancePolicy, explicitStatus?: CommitmentStatus) {
  if (explicitStatus) return explicitStatus;
  return policy === "none" ? "active" : "proposed";
}

export function deriveAcceptedAt(acceptedByOwnerAt?: string | null, acceptedByReceiverAt?: string | null) {
  if (!acceptedByOwnerAt && !acceptedByReceiverAt) return null;
  if (acceptedByOwnerAt && acceptedByReceiverAt) {
    return acceptedByOwnerAt > acceptedByReceiverAt ? acceptedByOwnerAt : acceptedByReceiverAt;
  }
  return acceptedByOwnerAt ?? acceptedByReceiverAt ?? null;
}

export function normalizeCommitmentHealth(value?: CommitmentHealth | null): CanonicalCommitmentHealth {
  return canonicalizeCommitmentHealth(value);
}

export function normalizeSeedParties(input: CreateCommitmentInput) {
  const partyMap = new Map<string, CommitmentPartyInput>();
  const requiresOwner = requiresOwnerAcceptance(input.acceptance_policy);
  const requiresReceiver = requiresReceiverAcceptance(input.acceptance_policy);

  for (const party of input.parties) {
    const key = `${party.role}:${party.party_type}:${party.user_id ?? party.team_id ?? "unknown"}`;
    partyMap.set(key, party);
  }

  const ownerKey = `owner:user:${input.primary_owner_user_id}`;
  const existingOwner = partyMap.get(ownerKey);
  partyMap.set(ownerKey, {
    party_type: "user",
    user_id: input.primary_owner_user_id,
    team_id: null,
    role: "owner",
    is_primary: true,
    acceptance_required: existingOwner?.acceptance_required ?? requiresOwner,
    accepted_at: existingOwner?.accepted_at ?? null,
    declined_at: existingOwner?.declined_at ?? null,
    active: existingOwner?.active ?? true,
  });

  if (input.primary_receiver_user_id) {
    const receiverUserKey = `receiver:user:${input.primary_receiver_user_id}`;
    const existingReceiverUser = partyMap.get(receiverUserKey);
    partyMap.set(receiverUserKey, {
      party_type: "user",
      user_id: input.primary_receiver_user_id,
      team_id: null,
      role: "receiver",
      is_primary: true,
      acceptance_required: existingReceiverUser?.acceptance_required ?? requiresReceiver,
      accepted_at: existingReceiverUser?.accepted_at ?? null,
      declined_at: existingReceiverUser?.declined_at ?? null,
      active: existingReceiverUser?.active ?? true,
    });
  }

  if (input.primary_receiver_team_id) {
    const receiverTeamKey = `receiver:team:${input.primary_receiver_team_id}`;
    const existingReceiverTeam = partyMap.get(receiverTeamKey);
    partyMap.set(receiverTeamKey, {
      party_type: "team",
      user_id: null,
      team_id: input.primary_receiver_team_id,
      role: "receiver",
      is_primary: true,
      acceptance_required: existingReceiverTeam?.acceptance_required ?? requiresReceiver,
      accepted_at: existingReceiverTeam?.accepted_at ?? null,
      declined_at: existingReceiverTeam?.declined_at ?? null,
      active: existingReceiverTeam?.active ?? true,
    });
  }

  return Array.from(partyMap.values());
}

export function canTransitionCommitmentStatus(from: CommitmentStatus, to: CommitmentStatus) {
  if (from === to) return true;
  return getAllowedCommitmentTransitions(from).includes(to);
}

export function buildRenegotiationSnapshot(source: {
  due_date?: string | null;
  primary_owner_user_id?: string | null;
  priority?: string | null;
  scope_summary?: string | null;
  success_criteria?: string | null;
  conditions_of_satisfaction?: string | null;
  health?: CommitmentHealth | null;
}) {
  return {
    due_date: source.due_date ?? null,
    primary_owner_user_id: source.primary_owner_user_id ?? null,
    priority: source.priority ?? null,
    scope_summary: source.scope_summary ?? null,
    success_criteria: source.success_criteria ?? null,
    conditions_of_satisfaction: source.conditions_of_satisfaction ?? null,
    health: canonicalizeCommitmentHealth(source.health),
  };
}
