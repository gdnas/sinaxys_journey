import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/errorMessage";
import {
  type AcceptancePolicy,
  type CommitmentHealth,
  type CommitmentPartyInput,
  type CommitmentPartyRole,
  type CommitmentPriority,
  type CommitmentStatus,
  type CreateCommitmentInput,
  type DependencyKind,
  type DependencyStatus,
  type DependencyTargetType,
  type EvidenceType,
  type ExecutionLinkRole,
  type ExecutionLinkTargetType,
  type ReviewStatus,
  type StrategicContextType,
  type UpdateCommitmentInput,
  buildRenegotiationSnapshot,
  canActivateCommitment,
  createCommitmentInputSchema,
  deriveAcceptedAt,
  deriveInitialCommitmentStatus,
  normalizeSeedParties,
  normalizeStrategicContextForPersistence,
  requiresOwnerAcceptance,
  requiresReceiverAcceptance,
  updateCommitmentInputSchema,
} from "@/lib/commitmentsDomain";
import {
  normalizeCommitmentEventRecord,
  type CommitmentEventType,
  type CommitmentReadableEventType,
} from "@/lib/commitmentTypes";

export interface DbCommitment {
  id: string;
  tenant_id: string;
  code: string;
  title: string;
  description: string | null;
  purpose: string;
  scope_summary: string | null;
  success_criteria: string | null;
  conditions_of_satisfaction: string | null;
  category: string;
  commitment_type: string;
  status: CommitmentStatus;
  health: CommitmentHealth;
  confidence_level: string | null;
  priority: CommitmentPriority;
  acceptance_policy: AcceptancePolicy;
  evidence_required: boolean;
  review_cadence: string | null;
  strategic_context_id: string | null;
  strategic_context_type: string | null;
  origin_decision_id: string | null;
  primary_owner_user_id: string;
  primary_receiver_user_id: string | null;
  primary_receiver_team_id: string | null;
  review_owner_id: string | null;
  start_date: string | null;
  due_date: string | null;
  accepted_by_owner_at: string | null;
  accepted_by_receiver_at: string | null;
  accepted_at: string | null;
  activated_at: string | null;
  fulfilled_at: string | null;
  closed_at: string | null;
  closed_reason: string | null;
  current_version: number;
  next_review_at: string | null;
  last_reviewed_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface DbCommitmentParty {
  id: string;
  tenant_id: string;
  commitment_id: string;
  party_type: "user" | "team";
  user_id: string | null;
  team_id: string | null;
  role: CommitmentPartyRole;
  is_primary: boolean;
  acceptance_required: boolean;
  accepted_at: string | null;
  declined_at: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbCommitmentDependency {
  id: string;
  tenant_id: string;
  commitment_id: string;
  dependency_kind: DependencyKind;
  depends_on_type: DependencyTargetType;
  depends_on_commitment_id: string | null;
  depends_on_project_id: string | null;
  depends_on_work_item_id: string | null;
  depends_on_decision_id: string | null;
  external_label: string | null;
  is_blocking: boolean;
  status: DependencyStatus;
  due_at: string | null;
  resolved_at: string | null;
  created_by: string;
  created_at: string;
}

export interface DbCommitmentEvidence {
  id: string;
  tenant_id: string;
  commitment_id: string;
  evidence_type: EvidenceType;
  title: string | null;
  description: string | null;
  url: string | null;
  file_id: string | null;
  payload: Record<string, unknown>;
  is_final: boolean;
  submitted_by: string;
  submitted_at: string;
}

export interface DbCommitmentRenegotiation {
  id: string;
  tenant_id: string;
  commitment_id: string;
  status: "open" | "approved" | "rejected" | "withdrawn";
  change_scope: boolean;
  change_due_date: boolean;
  change_owner: boolean;
  change_priority: boolean;
  change_conditions: boolean;
  old_snapshot: Record<string, unknown>;
  proposed_snapshot: Record<string, unknown>;
  reason: string;
  requested_by: string;
  approved_by: string | null;
  requested_at: string;
  resolved_at: string | null;
}

export interface DbCommitmentEvent {
  id: string;
  tenant_id: string;
  commitment_id: string;
  event_type: CommitmentReadableEventType | string;
  raw_event_type: string;
  canonical_event_type: CommitmentReadableEventType | string;
  actor_user_id: string | null;
  causation_type: string | null;
  causation_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface DbCommitmentExecutionLink {
  id: string;
  tenant_id: string;
  commitment_id: string;
  target_type: ExecutionLinkTargetType;
  project_id: string | null;
  work_item_id: string | null;
  okr_task_id: string | null;
  external_ref: string | null;
  role: ExecutionLinkRole;
  created_by: string;
  created_at: string;
}

export interface DbCommitmentComment {
  id: string;
  tenant_id: string;
  commitment_id: string;
  author_user_id: string;
  body: string;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface DbCommitmentReviewCycle {
  id: string;
  tenant_id: string;
  commitment_id: string;
  review_date: string;
  review_status: ReviewStatus;
  review_health: CommitmentHealth | null;
  review_confidence: string | null;
  summary: string | null;
  reviewed_by: string | null;
  created_at: string;
}

export interface CommitmentBundle {
  commitment: DbCommitment;
  parties: DbCommitmentParty[];
  dependencies: DbCommitmentDependency[];
  evidence: DbCommitmentEvidence[];
  renegotiations: DbCommitmentRenegotiation[];
  events: DbCommitmentEvent[];
  executionLinks: DbCommitmentExecutionLink[];
  comments: DbCommitmentComment[];
  reviewCycles: DbCommitmentReviewCycle[];
}

export interface CommitmentFilters {
  tenant_id?: string;
  status?: CommitmentStatus[];
  health?: CommitmentHealth[];
  priority?: CommitmentPriority[];
  primary_owner_user_id?: string;
  primary_receiver_user_id?: string;
  primary_receiver_team_id?: string;
  strategic_context_id?: string;
  origin_decision_id?: string;
  search?: string;
}

export interface CreateCommitmentDependencyInput {
  tenant_id: string;
  commitment_id: string;
  dependency_kind: DependencyKind;
  depends_on_type: DependencyTargetType;
  depends_on_commitment_id?: string | null;
  depends_on_project_id?: string | null;
  depends_on_work_item_id?: string | null;
  depends_on_decision_id?: string | null;
  external_label?: string | null;
  is_blocking?: boolean;
  status?: DependencyStatus;
  due_at?: string | null;
  resolved_at?: string | null;
  created_by: string;
}

export interface CreateCommitmentEvidenceInput {
  tenant_id: string;
  commitment_id: string;
  evidence_type: EvidenceType;
  title?: string | null;
  description?: string | null;
  url?: string | null;
  file_id?: string | null;
  payload?: Record<string, unknown>;
  is_final?: boolean;
  submitted_by: string;
}

export interface CreateCommitmentRenegotiationInput {
  tenant_id: string;
  commitment_id: string;
  reason: string;
  requested_by: string;
  proposed_snapshot: Record<string, unknown>;
  change_scope?: boolean;
  change_due_date?: boolean;
  change_owner?: boolean;
  change_priority?: boolean;
  change_conditions?: boolean;
}

export interface CreateCommitmentCommentInput {
  tenant_id: string;
  commitment_id: string;
  author_user_id: string;
  body: string;
  metadata?: Record<string, unknown>;
}

export interface CreateCommitmentExecutionLinkInput {
  tenant_id: string;
  commitment_id: string;
  target_type: ExecutionLinkTargetType;
  project_id?: string | null;
  work_item_id?: string | null;
  okr_task_id?: string | null;
  external_ref?: string | null;
  role: ExecutionLinkRole;
  created_by: string;
}

export interface CreateCommitmentReviewCycleInput {
  tenant_id: string;
  commitment_id: string;
  review_date: string;
  review_status?: ReviewStatus;
  review_health?: CommitmentHealth | null;
  review_confidence?: string | null;
  summary?: string | null;
  reviewed_by?: string | null;
}

const commitmentSelect = [
  "id",
  "tenant_id",
  "code",
  "title",
  "description",
  "purpose",
  "scope_summary",
  "success_criteria",
  "conditions_of_satisfaction",
  "category",
  "commitment_type",
  "status",
  "health",
  "confidence_level",
  "priority",
  "acceptance_policy",
  "evidence_required",
  "review_cadence",
  "strategic_context_id",
  "strategic_context_type",
  "origin_decision_id",
  "primary_owner_user_id",
  "primary_receiver_user_id",
  "primary_receiver_team_id",
  "review_owner_id",
  "start_date",
  "due_date",
  "accepted_by_owner_at",
  "accepted_by_receiver_at",
  "accepted_at",
  "activated_at",
  "fulfilled_at",
  "closed_at",
  "closed_reason",
  "current_version",
  "next_review_at",
  "last_reviewed_at",
  "created_by",
  "created_at",
  "updated_at",
].join(",");

function formatDbError(error: unknown) {
  return new Error(getErrorMessage(error));
}

function castRow<T>(data: unknown) {
  return data as T;
}

function castRows<T>(data: unknown) {
  return data as T[];
}

async function logCommitmentEvent(
  commitmentId: string,
  eventType: CommitmentEventType,
  payload: Record<string, unknown> = {},
  causationType?: string | null,
  causationId?: string | null,
) {

  const { data, error } = await supabase.rpc("commitment_log_event", {
    p_commitment_id: commitmentId,
    p_event_type: eventType,
    p_payload: payload,
    p_causation_type: causationType ?? null,
    p_causation_id: causationId ?? null,
  });

  if (error) throw formatDbError(error);
  return data as string;
}

function hasOwn<T extends object>(source: T, key: keyof T) {
  return Object.prototype.hasOwnProperty.call(source, key);
}

async function logCommitmentEvents(
  commitmentId: string,
  events: Array<{ type: CommitmentEventType; payload?: Record<string, unknown> }>,
) {
  for (const event of events) {
    await logCommitmentEvent(commitmentId, event.type, event.payload ?? {});
  }
}

function buildMaterialCommitmentEvents(previous: DbCommitment, next: DbCommitment) {
  const events: Array<{ type: CommitmentEventType; payload?: Record<string, unknown> }> = [];

  if (previous.health !== next.health) {
    events.push({
      type: "health_changed",
      payload: {
        previous_health: previous.health,
        health: next.health,
      },
    });
  }

  if (previous.status !== next.status) {
    const statusEventMap: Partial<Record<CommitmentStatus, CommitmentEventType>> = {
      active: "commitment_activated",
      fulfilled: "commitment_fulfilled",
      closed_unfulfilled: "commitment_closed_unfulfilled",
      cancelled: "commitment_cancelled",
    };

    const statusEventType = statusEventMap[next.status];
    if (statusEventType) {
      events.push({
        type: statusEventType,
        payload: {
          previous_status: previous.status,
          status: next.status,
        },
      });
    }
  }

  if (previous.due_date !== next.due_date) {
    events.push({
      type: "due_date_changed",
      payload: {
        previous_due_date: previous.due_date,
        due_date: next.due_date,
      },
    });
  }

  if (
    previous.primary_receiver_user_id !== next.primary_receiver_user_id
    || previous.primary_receiver_team_id !== next.primary_receiver_team_id
  ) {
    events.push({
      type: "receiver_changed",
      payload: {
        previous_primary_receiver_user_id: previous.primary_receiver_user_id,
        primary_receiver_user_id: next.primary_receiver_user_id,
        previous_primary_receiver_team_id: previous.primary_receiver_team_id,
        primary_receiver_team_id: next.primary_receiver_team_id,
      },
    });
  }

  return events;
}

function buildPartiesInsertPayload(tenantId: string, commitmentId: string, parties: CommitmentPartyInput[]) {

  return parties.map((party) => ({
    tenant_id: tenantId,
    commitment_id: commitmentId,
    party_type: party.party_type,
    user_id: party.user_id,
    team_id: party.team_id,
    role: party.role,
    is_primary: party.is_primary,
    acceptance_required: party.acceptance_required,
    accepted_at: party.accepted_at,
    declined_at: party.declined_at,
    active: party.active,
  }));
}

async function cleanupCommitment(commitmentId: string) {
  await supabase.from("commitments").delete().eq("id", commitmentId);
}

export async function listCommitments(filters: CommitmentFilters = {}, page = 0, perPage = 50) {
  let query = supabase.from("commitments").select(commitmentSelect, { count: "exact" });

  if (filters.tenant_id) query = query.eq("tenant_id", filters.tenant_id);
  if (filters.status?.length) query = query.in("status", filters.status);
  if (filters.health?.length) query = query.in("health", filters.health);
  if (filters.priority?.length) query = query.in("priority", filters.priority);
  if (filters.primary_owner_user_id) query = query.eq("primary_owner_user_id", filters.primary_owner_user_id);
  if (filters.primary_receiver_user_id) query = query.eq("primary_receiver_user_id", filters.primary_receiver_user_id);
  if (filters.primary_receiver_team_id) query = query.eq("primary_receiver_team_id", filters.primary_receiver_team_id);
  if (filters.strategic_context_id) query = query.eq("strategic_context_id", filters.strategic_context_id);
  if (filters.origin_decision_id) query = query.eq("origin_decision_id", filters.origin_decision_id);
  if (filters.search) {
    const searchTerm = filters.search.replace(/[%(),]/g, " ").trim();
    if (searchTerm) {
      query = query.or(`title.ilike.%${searchTerm}%,description.ilike.%${searchTerm}%,purpose.ilike.%${searchTerm}%`);
    }
  }

  const start = page * perPage;

  const end = start + perPage - 1;

  const { data, error, count } = await query.order("updated_at", { ascending: false }).range(start, end);
  if (error) throw formatDbError(error);

  return {
    rows: castRows<DbCommitment>(data ?? []),
    total: count ?? 0,
  };
}

export async function getCommitment(commitmentId: string) {
  const { data, error } = await supabase.from("commitments").select(commitmentSelect).eq("id", commitmentId).maybeSingle();
  if (error) throw formatDbError(error);
  return castRow<DbCommitment | null>(data ?? null);
}

export async function listCommitmentParties(commitmentId: string) {

  const { data, error } = await supabase
    .from("commitment_parties")
    .select("id,tenant_id,commitment_id,party_type,user_id,team_id,role,is_primary,acceptance_required,accepted_at,declined_at,active,created_at,updated_at")
    .eq("commitment_id", commitmentId)
    .order("role", { ascending: true })
    .order("is_primary", { ascending: false });

  if (error) throw formatDbError(error);
  return castRows<DbCommitmentParty>(data ?? []);
}

export async function listCommitmentDependencies(commitmentId: string) {

  const { data, error } = await supabase
    .from("commitment_dependencies")
    .select("id,tenant_id,commitment_id,dependency_kind,depends_on_type,depends_on_commitment_id,depends_on_project_id,depends_on_work_item_id,depends_on_decision_id,external_label,is_blocking,status,due_at,resolved_at,created_by,created_at")
    .eq("commitment_id", commitmentId)
    .order("created_at", { ascending: false });

  if (error) throw formatDbError(error);
  return castRows<DbCommitmentDependency>(data ?? []);
}

export async function listCommitmentEvidence(commitmentId: string) {

  const { data, error } = await supabase
    .from("commitment_evidence")
    .select("id,tenant_id,commitment_id,evidence_type,title,description,url,file_id,payload,is_final,submitted_by,submitted_at")
    .eq("commitment_id", commitmentId)
    .order("submitted_at", { ascending: false });

  if (error) throw formatDbError(error);
  return castRows<DbCommitmentEvidence>(data ?? []);
}

export async function listCommitmentRenegotiations(commitmentId: string) {

  const { data, error } = await supabase
    .from("commitment_renegotiations")
    .select("id,tenant_id,commitment_id,status,change_scope,change_due_date,change_owner,change_priority,change_conditions,old_snapshot,proposed_snapshot,reason,requested_by,approved_by,requested_at,resolved_at")
    .eq("commitment_id", commitmentId)
    .order("requested_at", { ascending: false });

  if (error) throw formatDbError(error);
  return castRows<DbCommitmentRenegotiation>(data ?? []);
}

export async function listCommitmentEvents(commitmentId: string) {
  const { data, error } = await supabase
    .from("commitment_events")
    .select("id,tenant_id,commitment_id,event_type,actor_user_id,causation_type,causation_id,payload,created_at")
    .eq("commitment_id", commitmentId)
    .order("created_at", { ascending: false });

  if (error) throw formatDbError(error);
  return (data ?? []).map((row) => normalizeCommitmentEventRecord(row as Omit<DbCommitmentEvent, "raw_event_type" | "canonical_event_type">));
}

export async function listCommitmentExecutionLinks(commitmentId: string) {

  const { data, error } = await supabase
    .from("commitment_execution_links")
    .select("id,tenant_id,commitment_id,target_type,project_id,work_item_id,okr_task_id,external_ref,role,created_by,created_at")
    .eq("commitment_id", commitmentId)
    .order("created_at", { ascending: false });

  if (error) throw formatDbError(error);
  return castRows<DbCommitmentExecutionLink>(data ?? []);
}

export async function listCommitmentComments(commitmentId: string) {

  const { data, error } = await supabase
    .from("commitment_comments")
    .select("id,tenant_id,commitment_id,author_user_id,body,metadata,created_at,updated_at")
    .eq("commitment_id", commitmentId)
    .order("created_at", { ascending: false });

  if (error) throw formatDbError(error);
  return castRows<DbCommitmentComment>(data ?? []);
}

export async function listCommitmentReviewCycles(commitmentId: string) {

  const { data, error } = await supabase
    .from("commitment_review_cycles")
    .select("id,tenant_id,commitment_id,review_date,review_status,review_health,review_confidence,summary,reviewed_by,created_at")
    .eq("commitment_id", commitmentId)
    .order("review_date", { ascending: true });

  if (error) throw formatDbError(error);
  return castRows<DbCommitmentReviewCycle>(data ?? []);
}

export async function getCommitmentBundle(commitmentId: string): Promise<CommitmentBundle | null> {

  const commitment = await getCommitment(commitmentId);
  if (!commitment) return null;

  const [parties, dependencies, evidence, renegotiations, events, executionLinks, comments, reviewCycles] = await Promise.all([
    listCommitmentParties(commitmentId),
    listCommitmentDependencies(commitmentId),
    listCommitmentEvidence(commitmentId),
    listCommitmentRenegotiations(commitmentId),
    listCommitmentEvents(commitmentId),
    listCommitmentExecutionLinks(commitmentId),
    listCommitmentComments(commitmentId),
    listCommitmentReviewCycles(commitmentId),
  ]);

  return {
    commitment,
    parties,
    dependencies,
    evidence,
    renegotiations,
    events,
    executionLinks,
    comments,
    reviewCycles,
  };
}

export async function createCommitment(input: CreateCommitmentInput) {
  const parsed = createCommitmentInputSchema.parse(input);
  const normalizedParties = normalizeSeedParties(parsed);
  const initialStatus = deriveInitialCommitmentStatus(parsed.acceptance_policy, parsed.status);

  const strategicContext = normalizeStrategicContextForPersistence(parsed.strategic_context_id, parsed.strategic_context_type);

  const payload = {
    tenant_id: parsed.tenant_id,
    title: parsed.title,
    description: parsed.description,
    purpose: parsed.purpose,
    scope_summary: parsed.scope_summary,
    success_criteria: parsed.success_criteria,
    conditions_of_satisfaction: parsed.conditions_of_satisfaction,
    category: parsed.category,
    commitment_type: parsed.commitment_type,
    status: initialStatus,
    health: parsed.health,
    confidence_level: parsed.confidence_level,
    priority: parsed.priority,
    acceptance_policy: parsed.acceptance_policy,
    evidence_required: parsed.evidence_required,
    review_cadence: parsed.review_cadence,
    strategic_context_id: strategicContext.strategic_context_id,
    strategic_context_type: strategicContext.strategic_context_type,
    origin_decision_id: parsed.origin_decision_id,
    primary_owner_user_id: parsed.primary_owner_user_id,
    primary_receiver_user_id: parsed.primary_receiver_user_id,
    primary_receiver_team_id: parsed.primary_receiver_team_id,
    review_owner_id: parsed.review_owner_id,
    start_date: parsed.start_date,
    due_date: parsed.due_date,
    next_review_at: parsed.next_review_at,
    created_by: parsed.created_by,
  };

  const { data: createdData, error } = await supabase.from("commitments").insert(payload).select(commitmentSelect).single();
  if (error) throw formatDbError(error);
  const commitment = castRow<DbCommitment>(createdData);

  try {
    if (normalizedParties.length) {
      const { error: partiesError } = await supabase.from("commitment_parties").insert(buildPartiesInsertPayload(parsed.tenant_id, commitment.id, normalizedParties));
      if (partiesError) throw partiesError;
    }

    if (parsed.next_review_at) {
      const { error: reviewError } = await supabase.from("commitment_review_cycles").insert({
        tenant_id: parsed.tenant_id,
        commitment_id: commitment.id,
        review_date: parsed.next_review_at,
        review_status: "scheduled",
      });
      if (reviewError) throw reviewError;
    }

    await logCommitmentEvent(commitment.id, "commitment_created", {
      title: commitment.title,
      status: commitment.status,
      acceptance_policy: commitment.acceptance_policy,
      commitment_type: commitment.commitment_type,
      category: commitment.category,
    });
  } catch (errorAfterCreate) {
    await cleanupCommitment(commitment.id);
    throw formatDbError(errorAfterCreate);
  }

  return (await getCommitmentBundle(commitment.id)) as CommitmentBundle;
}

export async function updateCommitment(commitmentId: string, patch: UpdateCommitmentInput) {
  const parsed = updateCommitmentInputSchema.parse(patch);
  const current = await getCommitment(commitmentId);
  if (!current) throw new Error("Compromisso não encontrado.");

  const update: Record<string, unknown> = {};

  const keys = [
    "title",
    "description",
    "purpose",
    "scope_summary",
    "success_criteria",
    "conditions_of_satisfaction",
    "category",
    "commitment_type",
    "status",
    "health",
    "confidence_level",
    "priority",
    "acceptance_policy",
    "evidence_required",
    "review_cadence",
    "origin_decision_id",
    "primary_receiver_user_id",
    "primary_receiver_team_id",
    "review_owner_id",
    "start_date",
    "due_date",
    "next_review_at",
    "closed_reason",
  ] as const;

  for (const key of keys) {
    if (hasOwn(parsed, key)) {
      update[key] = parsed[key] ?? null;
    }
  }

  if (hasOwn(parsed, "strategic_context_id") || hasOwn(parsed, "strategic_context_type")) {
    const nextStrategicContextId = hasOwn(parsed, "strategic_context_id")
      ? parsed.strategic_context_id ?? null
      : current.strategic_context_id;
    const nextStrategicContextType = hasOwn(parsed, "strategic_context_type")
      ? (parsed.strategic_context_type ?? null)
      : (current.strategic_context_type as StrategicContextType | null);

    Object.assign(update, normalizeStrategicContextForPersistence(nextStrategicContextId, nextStrategicContextType));
  }

  if (Object.keys(update).length === 0) {
    return current;
  }

  const { data, error } = await supabase.from("commitments").update(update).eq("id", commitmentId).select(commitmentSelect).single();
  if (error) throw formatDbError(error);

  const updatedCommitment = castRow<DbCommitment>(data);
  await logCommitmentEvents(commitmentId, buildMaterialCommitmentEvents(current, updatedCommitment));
  return updatedCommitment;
}

export async function acceptCommitment(commitmentId: string, role: "owner" | "receiver") {

  const current = await getCommitment(commitmentId);
  if (!current) throw new Error("Compromisso não encontrado.");

  const now = new Date().toISOString();
  const nextOwnerAcceptedAt = role === "owner" ? now : current.accepted_by_owner_at;
  const nextReceiverAcceptedAt = role === "receiver" ? now : current.accepted_by_receiver_at;

  if (role === "owner" && !requiresOwnerAcceptance(current.acceptance_policy)) {
    throw new Error("Este compromisso não exige aceite do owner.");
  }

  if (role === "receiver" && !requiresReceiverAcceptance(current.acceptance_policy)) {
    throw new Error("Este compromisso não exige aceite do receiver.");
  }

  const update: Partial<DbCommitment> & Record<string, unknown> = {
    accepted_by_owner_at: nextOwnerAcceptedAt,
    accepted_by_receiver_at: nextReceiverAcceptedAt,
    accepted_at: deriveAcceptedAt(nextOwnerAcceptedAt, nextReceiverAcceptedAt),
  };

  if (canActivateCommitment(current.acceptance_policy, nextOwnerAcceptedAt, nextReceiverAcceptedAt)) {
    update.status = "active";
    update.activated_at = current.activated_at ?? now;
  }

  const { data, error } = await supabase.from("commitments").update(update).eq("id", commitmentId).select(commitmentSelect).single();
  if (error) throw formatDbError(error);
  const commitment = castRow<DbCommitment>(data);

  await supabase
    .from("commitment_parties")
    .update({ accepted_at: now })
    .eq("commitment_id", commitmentId)
    .eq("role", role)
    .eq("is_primary", true)
    .eq("active", true);

  const events: Array<{ type: CommitmentEventType; payload?: Record<string, unknown> }> = [
    {
      type: role === "owner" ? "owner_accepted" : "receiver_accepted",
      payload: {
        accepted_at: now,
        activated: commitment.status === "active",
      },
    },
  ];

  if (current.status !== "active" && commitment.status === "active") {
    events.push({
      type: "commitment_activated",
      payload: {
        previous_status: current.status,
        status: commitment.status,
        accepted_at: update.accepted_at,
      },
    });
  }

  await logCommitmentEvents(commitmentId, events);

  return commitment;
}

export async function setCommitmentHealth(commitmentId: string, health: CommitmentHealth, reason?: string) {
  const current = await getCommitment(commitmentId);
  if (!current) throw new Error("Compromisso não encontrado.");

  const { data, error } = await supabase.from("commitments").update({ health }).eq("id", commitmentId).select(commitmentSelect).single();
  if (error) throw formatDbError(error);

  await logCommitmentEvent(commitmentId, "health_changed", {
    previous_health: current.health,
    reason: reason ?? null,
    health,
  });

  return castRow<DbCommitment>(data);
}

export async function addCommitmentComment(input: CreateCommitmentCommentInput) {
  const payload = {
    tenant_id: input.tenant_id,
    commitment_id: input.commitment_id,
    author_user_id: input.author_user_id,
    body: input.body.trim(),
    metadata: input.metadata ?? {},
  };

  const { data, error } = await supabase
    .from("commitment_comments")
    .insert(payload)
    .select("id,tenant_id,commitment_id,author_user_id,body,metadata,created_at,updated_at")
    .single();

  if (error) throw formatDbError(error);
  const comment = castRow<DbCommitmentComment>(data);
  await logCommitmentEvent(input.commitment_id, "comment_added", { comment_id: comment.id });
  return comment;
}

export async function addCommitmentEvidence(input: CreateCommitmentEvidenceInput) {
  const payload = {
    tenant_id: input.tenant_id,
    commitment_id: input.commitment_id,
    evidence_type: input.evidence_type,
    title: input.title ?? null,
    description: input.description ?? null,
    url: input.url ?? null,
    file_id: input.file_id ?? null,
    payload: input.payload ?? {},
    is_final: input.is_final ?? false,
    submitted_by: input.submitted_by,
  };

  const { data, error } = await supabase
    .from("commitment_evidence")
    .insert(payload)
    .select("id,tenant_id,commitment_id,evidence_type,title,description,url,file_id,payload,is_final,submitted_by,submitted_at")
    .single();

  if (error) throw formatDbError(error);
  const evidence = castRow<DbCommitmentEvidence>(data);
  await logCommitmentEvent(input.commitment_id, "evidence_added", { evidence_id: evidence.id, is_final: evidence.is_final });
  return evidence;
}

export async function createCommitmentDependency(input: CreateCommitmentDependencyInput) {
  const payload = {
    tenant_id: input.tenant_id,
    commitment_id: input.commitment_id,
    dependency_kind: input.dependency_kind,
    depends_on_type: input.depends_on_type,
    depends_on_commitment_id: input.depends_on_commitment_id ?? null,
    depends_on_project_id: input.depends_on_project_id ?? null,
    depends_on_work_item_id: input.depends_on_work_item_id ?? null,
    depends_on_decision_id: input.depends_on_decision_id ?? null,
    external_label: input.external_label ?? null,
    is_blocking: input.is_blocking ?? true,
    status: input.status ?? "open",
    due_at: input.due_at ?? null,
    resolved_at: input.resolved_at ?? null,
    created_by: input.created_by,
  };

  const { data, error } = await supabase
    .from("commitment_dependencies")
    .insert(payload)
    .select("id,tenant_id,commitment_id,dependency_kind,depends_on_type,depends_on_commitment_id,depends_on_project_id,depends_on_work_item_id,depends_on_decision_id,external_label,is_blocking,status,due_at,resolved_at,created_by,created_at")
    .single();

  if (error) throw formatDbError(error);
  const dependency = castRow<DbCommitmentDependency>(data);

  const events: Array<{ type: CommitmentEventType; payload?: Record<string, unknown> }> = [
    {
      type: "dependency_added",
      payload: {
        dependency_id: dependency.id,
        is_blocking: dependency.is_blocking,
      },
    },
  ];

  if (dependency.is_blocking && dependency.status === "open") {
    const current = await getCommitment(input.commitment_id);
    await supabase.from("commitments").update({ health: "blocked" }).eq("id", input.commitment_id);
    if (current && current.health !== "blocked") {
      events.push({
        type: "health_changed",
        payload: {
          previous_health: current.health,
          health: "blocked",
          reason: "blocking_dependency_added",
          dependency_id: dependency.id,
        },
      });
    }
  }

  await logCommitmentEvents(input.commitment_id, events);
  return dependency;
}

export async function createCommitmentRenegotiation(input: CreateCommitmentRenegotiationInput) {
  const current = await getCommitment(input.commitment_id);
  if (!current) throw new Error("Compromisso não encontrado.");

  const oldSnapshot = buildRenegotiationSnapshot(current);
  const payload = {
    tenant_id: input.tenant_id,
    commitment_id: input.commitment_id,
    status: "open",
    change_scope: input.change_scope ?? false,
    change_due_date: input.change_due_date ?? false,
    change_owner: input.change_owner ?? false,
    change_priority: input.change_priority ?? false,
    change_conditions: input.change_conditions ?? false,
    old_snapshot: oldSnapshot,
    proposed_snapshot: input.proposed_snapshot,
    reason: input.reason.trim(),
    requested_by: input.requested_by,
  };

  const { data, error } = await supabase
    .from("commitment_renegotiations")
    .insert(payload)
    .select("id,tenant_id,commitment_id,status,change_scope,change_due_date,change_owner,change_priority,change_conditions,old_snapshot,proposed_snapshot,reason,requested_by,approved_by,requested_at,resolved_at")
    .single();

  if (error) throw formatDbError(error);
  const renegotiation = castRow<DbCommitmentRenegotiation>(data);

  await supabase.from("commitments").update({ status: "renegotiating" }).eq("id", input.commitment_id);
  await logCommitmentEvent(input.commitment_id, "renegotiation_requested", {
    renegotiation_id: renegotiation.id,
    reason: renegotiation.reason,
  });
  return renegotiation;
}

export async function linkCommitmentExecution(input: CreateCommitmentExecutionLinkInput) {
  const payload = {
    tenant_id: input.tenant_id,
    commitment_id: input.commitment_id,
    target_type: input.target_type,
    project_id: input.project_id ?? null,
    work_item_id: input.work_item_id ?? null,
    okr_task_id: input.okr_task_id ?? null,
    external_ref: input.external_ref ?? null,
    role: input.role,
    created_by: input.created_by,
  };

  const { data, error } = await supabase
    .from("commitment_execution_links")
    .insert(payload)
    .select("id,tenant_id,commitment_id,target_type,project_id,work_item_id,okr_task_id,external_ref,role,created_by,created_at")
    .single();

  if (error) throw formatDbError(error);
  const executionLink = castRow<DbCommitmentExecutionLink>(data);
  await logCommitmentEvent(input.commitment_id, "execution_linked", {
    execution_link_id: executionLink.id,
    target_type: executionLink.target_type,
  });
  return executionLink;
}

export async function scheduleCommitmentReview(input: CreateCommitmentReviewCycleInput) {
  const payload = {
    tenant_id: input.tenant_id,
    commitment_id: input.commitment_id,
    review_date: input.review_date,
    review_status: input.review_status ?? "scheduled",
    review_health: input.review_health ?? null,
    review_confidence: input.review_confidence ?? null,
    summary: input.summary ?? null,
    reviewed_by: input.reviewed_by ?? null,
  };

  const { data, error } = await supabase
    .from("commitment_review_cycles")
    .insert(payload)
    .select("id,tenant_id,commitment_id,review_date,review_status,review_health,review_confidence,summary,reviewed_by,created_at")
    .single();

  if (error) throw formatDbError(error);
  const reviewCycle = castRow<DbCommitmentReviewCycle>(data);

  await supabase
    .from("commitments")
    .update({
      next_review_at: reviewCycle.review_status === "scheduled" ? input.review_date : null,
      last_reviewed_at: reviewCycle.review_status === "completed" ? input.review_date : null,
    })
    .eq("id", input.commitment_id);

  await logCommitmentEvent(input.commitment_id, "review_recorded", {
    review_cycle_id: reviewCycle.id,
    review_status: reviewCycle.review_status,
    review_health: reviewCycle.review_health,
  });
  return reviewCycle;
}
