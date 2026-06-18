import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/errorMessage";
import { normalizeCommitmentEventRecord } from "@/lib/commitmentTypes";
import type {
  DbCommitment,
  DbCommitmentDependency,
  DbCommitmentEvidence,
  DbCommitmentExecutionLink,
  DbCommitmentParty,
} from "@/lib/commitmentsDb";
import type { DbCommitmentEventRow } from "@/lib/commitmentEventsDb";

export interface CommitmentInspectorBundle {
  commitment: DbCommitment;
  parties: DbCommitmentParty[];
  timeline: DbCommitmentEventRow[];
  openDependencies: DbCommitmentDependency[];
  evidence: DbCommitmentEvidence[];
  executionLinks: DbCommitmentExecutionLink[];
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

const partiesSelect = "id,tenant_id,commitment_id,party_type,user_id,team_id,role,is_primary,acceptance_required,accepted_at,declined_at,active,created_at,updated_at";
const timelineSelect = "id,tenant_id,commitment_id,event_type,actor_user_id,causation_type,causation_id,payload,created_at";
const dependenciesSelect = "id,tenant_id,commitment_id,dependency_kind,depends_on_type,depends_on_commitment_id,depends_on_project_id,depends_on_work_item_id,depends_on_decision_id,external_label,is_blocking,status,due_at,resolved_at,created_by,created_at";
const evidenceSelect = "id,tenant_id,commitment_id,evidence_type,title,description,url,file_id,payload,is_final,submitted_by,submitted_at";
const executionLinksSelect = "id,tenant_id,commitment_id,target_type,project_id,work_item_id,okr_task_id,external_ref,role,created_by,created_at";

function formatDbError(error: unknown) {
  return new Error(getErrorMessage(error));
}

function castRow<T>(data: unknown) {
  return data as T;
}

function castRows<T>(data: unknown) {
  return data as T[];
}

export function sortCommitmentInspectorTimeline(items: DbCommitmentEventRow[]) {
  return [...items].sort((left, right) => {
    const leftTime = new Date(left.created_at).getTime();
    const rightTime = new Date(right.created_at).getTime();
    return rightTime - leftTime;
  });
}

export function filterOpenCommitmentDependencies(items: DbCommitmentDependency[]) {
  return items.filter((item) => item.status === "open");
}

function normalizeTimelineRow(row: Record<string, unknown>) {
  return normalizeCommitmentEventRecord(row as {
    id: string;
    tenant_id: string;
    commitment_id: string;
    event_type: string;
    actor_user_id: string | null;
    causation_type: string | null;
    causation_id: string | null;
    payload?: Record<string, unknown> | null;
    created_at: string;
  }) as DbCommitmentEventRow;
}

export async function getCommitmentInspectorCommitment(commitmentId: string) {
  const { data, error } = await supabase.from("commitments").select(commitmentSelect).eq("id", commitmentId).maybeSingle();
  if (error) throw formatDbError(error);
  return castRow<DbCommitment | null>(data ?? null);
}

export async function listCommitmentInspectorParties(commitmentId: string) {
  const { data, error } = await supabase
    .from("commitment_parties")
    .select(partiesSelect)
    .eq("commitment_id", commitmentId)
    .order("role", { ascending: true })
    .order("is_primary", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw formatDbError(error);
  return castRows<DbCommitmentParty>(data ?? []);
}

export async function listCommitmentInspectorTimeline(commitmentId: string) {
  const { data, error } = await supabase
    .from("commitment_events")
    .select(timelineSelect)
    .eq("commitment_id", commitmentId)
    .order("created_at", { ascending: false });

  if (error) throw formatDbError(error);
  return sortCommitmentInspectorTimeline((data ?? []).map((row) => normalizeTimelineRow(row as Record<string, unknown>)));
}

export async function listOpenCommitmentDependencies(commitmentId: string) {
  const { data, error } = await supabase
    .from("commitment_dependencies")
    .select(dependenciesSelect)
    .eq("commitment_id", commitmentId)
    .eq("status", "open")
    .order("due_at", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw formatDbError(error);
  return filterOpenCommitmentDependencies(castRows<DbCommitmentDependency>(data ?? []));
}

export async function listCommitmentInspectorEvidence(commitmentId: string) {
  const { data, error } = await supabase
    .from("commitment_evidence")
    .select(evidenceSelect)
    .eq("commitment_id", commitmentId)
    .order("is_final", { ascending: false })
    .order("submitted_at", { ascending: false });

  if (error) throw formatDbError(error);
  return castRows<DbCommitmentEvidence>(data ?? []);
}

export async function listCommitmentInspectorExecutionLinks(commitmentId: string) {
  const { data, error } = await supabase
    .from("commitment_execution_links")
    .select(executionLinksSelect)
    .eq("commitment_id", commitmentId)
    .order("created_at", { ascending: false });

  if (error) throw formatDbError(error);
  return castRows<DbCommitmentExecutionLink>(data ?? []);
}

export const commitmentInspectorQueries = {
  getCommitmentInspectorCommitment,
  listCommitmentInspectorParties,
  listCommitmentInspectorTimeline,
  listOpenCommitmentDependencies,
  listCommitmentInspectorEvidence,
  listCommitmentInspectorExecutionLinks,
};

export async function getCommitmentInspectorBundle(commitmentId: string): Promise<CommitmentInspectorBundle | null> {
  const commitment = await commitmentInspectorQueries.getCommitmentInspectorCommitment(commitmentId);
  if (!commitment) return null;

  const [parties, timeline, openDependencies, evidence, executionLinks] = await Promise.all([
    commitmentInspectorQueries.listCommitmentInspectorParties(commitmentId),
    commitmentInspectorQueries.listCommitmentInspectorTimeline(commitmentId),
    commitmentInspectorQueries.listOpenCommitmentDependencies(commitmentId),
    commitmentInspectorQueries.listCommitmentInspectorEvidence(commitmentId),
    commitmentInspectorQueries.listCommitmentInspectorExecutionLinks(commitmentId),
  ]);

  return {
    commitment,
    parties,
    timeline,
    openDependencies,
    evidence,
    executionLinks,
  };
}
