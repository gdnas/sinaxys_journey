import { z } from "zod";

export const commitmentStatusValues = [
  "proposed",
  "negotiating",
  "active",
  "renegotiating",
  "fulfilled",
  "closed_unfulfilled",
  "cancelled",
] as const;

export const commitmentHealthValues = ["on_track", "at_risk", "blocked", "overdue", "unknown"] as const;
export const commitmentPriorityValues = ["low", "medium", "high", "critical"] as const;
export const commitmentCategoryValues = ["delivery", "alignment", "approval", "bau", "compliance"] as const;
export const commitmentTypeValues = ["bilateral", "unilateral", "routine", "self_commitment"] as const;
export const acceptancePolicyValues = ["none", "owner_only", "receiver_only", "bilateral"] as const;
export const strategicContextTypeValues = ["objective", "key_result"] as const;
export const commitmentPartyTypeValues = ["user", "team"] as const;
export const commitmentPartyRoleValues = [
  "owner",
  "receiver",
  "requester",
  "sponsor",
  "approver",
  "contributor",
  "watcher",
  "reviewer",
] as const;
export const dependencyKindValues = ["precondition", "input", "approval", "external", "sequence"] as const;
export const dependencyTargetTypeValues = ["commitment", "project", "work_item", "decision", "external_condition"] as const;
export const dependencyStatusValues = ["open", "resolved", "waived"] as const;
export const evidenceTypeValues = ["note", "file", "link", "metric", "approval", "external_reference"] as const;
export const decisionTypeValues = ["create", "change", "prioritize", "cancel", "suspend", "resume"] as const;
export const decisionStatusValues = ["draft", "approved", "rejected", "superseded"] as const;
export const renegotiationStatusValues = ["open", "approved", "rejected", "withdrawn"] as const;
export const executionLinkTargetTypeValues = ["project", "work_item", "okr_task", "checklist", "external"] as const;
export const executionLinkRoleValues = ["implements", "tracks", "supports", "evidences"] as const;
export const reviewStatusValues = ["scheduled", "completed", "missed", "rescheduled"] as const;

export type CommitmentStatus = (typeof commitmentStatusValues)[number];
export type CommitmentHealth = (typeof commitmentHealthValues)[number];
export type CommitmentPriority = (typeof commitmentPriorityValues)[number];
export type CommitmentCategory = (typeof commitmentCategoryValues)[number];
export type CommitmentType = (typeof commitmentTypeValues)[number];
export type AcceptancePolicy = (typeof acceptancePolicyValues)[number];
export type StrategicContextType = (typeof strategicContextTypeValues)[number];
export type CommitmentPartyType = (typeof commitmentPartyTypeValues)[number];
export type CommitmentPartyRole = (typeof commitmentPartyRoleValues)[number];
export type DependencyKind = (typeof dependencyKindValues)[number];
export type DependencyTargetType = (typeof dependencyTargetTypeValues)[number];
export type DependencyStatus = (typeof dependencyStatusValues)[number];
export type EvidenceType = (typeof evidenceTypeValues)[number];
export type DecisionType = (typeof decisionTypeValues)[number];
export type DecisionStatus = (typeof decisionStatusValues)[number];
export type RenegotiationStatus = (typeof renegotiationStatusValues)[number];
export type ExecutionLinkTargetType = (typeof executionLinkTargetTypeValues)[number];
export type ExecutionLinkRole = (typeof executionLinkRoleValues)[number];
export type ReviewStatus = (typeof reviewStatusValues)[number];

export const terminalCommitmentStatuses = new Set<CommitmentStatus>(["fulfilled", "closed_unfulfilled", "cancelled"]);

const optionalText = z.string().trim().min(1).nullish().transform((value) => value ?? null);
const optionalUuid = z.string().uuid().nullish().transform((value) => value ?? null);
const optionalTimestamp = z.string().trim().min(1).nullish().transform((value) => value ?? null);

export const commitmentPartyInputSchema = z
  .object({
    party_type: z.enum(commitmentPartyTypeValues),
    user_id: optionalUuid,
    team_id: optionalUuid,
    role: z.enum(commitmentPartyRoleValues),
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
  health: z.enum(commitmentHealthValues).optional().default("unknown"),
  confidence_level: optionalText,
  priority: z.enum(commitmentPriorityValues).optional().default("medium"),
  acceptance_policy: z.enum(acceptancePolicyValues).optional().default("receiver_only"),
  evidence_required: z.boolean().optional().default(false),
  review_cadence: optionalText,
  strategic_context_id: optionalUuid,
  strategic_context_type: z.enum(strategicContextTypeValues).optional().default("objective"),
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

  const receiverOptional = value.commitment_type === "self_commitment" || value.commitment_type === "routine" || value.category === "bau";
  if (!receiverOptional && !value.primary_receiver_user_id && !value.primary_receiver_team_id) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Compromissos não-BAU precisam de receiver explícito no MVP.",
      path: ["primary_receiver_user_id"],
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
  return terminalCommitmentStatuses.has(status);
}

export function requiresOwnerAcceptance(policy: AcceptancePolicy) {
  return policy === "owner_only" || policy === "bilateral";
}

export function requiresReceiverAcceptance(policy: AcceptancePolicy) {
  return policy === "receiver_only" || policy === "bilateral";
}

export function canActivateCommitment(policy: AcceptancePolicy, acceptedByOwnerAt?: string | null, acceptedByReceiverAt?: string | null) {
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

export function buildRenegotiationSnapshot(source: {
  due_date?: string | null;
  primary_owner_user_id?: string | null;
  priority?: string | null;
  scope_summary?: string | null;
  success_criteria?: string | null;
  conditions_of_satisfaction?: string | null;
}) {
  return {
    due_date: source.due_date ?? null,
    primary_owner_user_id: source.primary_owner_user_id ?? null,
    priority: source.priority ?? null,
    scope_summary: source.scope_summary ?? null,
    success_criteria: source.success_criteria ?? null,
    conditions_of_satisfaction: source.conditions_of_satisfaction ?? null,
  };
}
