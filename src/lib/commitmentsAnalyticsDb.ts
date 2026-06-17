import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/errorMessage";
import type { CanonicalCommitmentHealth, CommitmentHealth, CommitmentPriority, CommitmentStatus } from "@/lib/commitmentsDomain";

export interface DbCommitmentAnalyticsOverview {
  commitment_id: string;
  tenant_id: string;
  code: string;
  title: string;
  status: CommitmentStatus;
  health: CommitmentHealth;
  priority: CommitmentPriority;
  acceptance_policy: string;
  evidence_required: boolean;
  due_date: string | null;
  start_date: string | null;
  primary_owner_user_id: string;
  primary_receiver_user_id: string | null;
  primary_receiver_team_id: string | null;
  strategic_context_id: string | null;
  strategic_context_type: string | null;
  origin_decision_id: string | null;
  open_dependencies_total: number;
  blocking_dependencies_open: number;
  final_evidence_count: number;
  evidence_count: number;
  approved_renegotiation_count: number;
  renegotiation_count: number;
  execution_link_count: number;
  is_overdue: boolean;
  missing_required_evidence: boolean;
  created_at: string;
  updated_at: string;
  canonical_health: CanonicalCommitmentHealth;
  open_renegotiation_count: number;
  last_reviewed_at: string | null;
  next_review_at: string | null;
}

export interface DbDecisionWithoutExecution {
  decision_id: string;
  tenant_id: string;
  title: string;
  decision_type: string;
  status: string;
  effective_at: string | null;
  linked_commitments: number;
  execution_links: number;
  final_evidence_count: number;
}

export interface CommitmentAnalyticsFilters {
  tenant_id?: string;
  status?: CommitmentStatus[];
  health?: CommitmentHealth[];
  priority?: CommitmentPriority[];
  primary_owner_user_id?: string;
}

function formatDbError(error: unknown) {
  return new Error(getErrorMessage(error));
}

async function queryAnalyticsView(viewName: string, filters: CommitmentAnalyticsFilters = {}) {
  let query = supabase.from(viewName).select("*").order("updated_at", { ascending: false });

  if (filters.tenant_id) query = query.eq("tenant_id", filters.tenant_id);
  if (filters.primary_owner_user_id) query = query.eq("primary_owner_user_id", filters.primary_owner_user_id);
  if (filters.status?.length) query = query.in("status", filters.status);
  if (filters.health?.length) query = query.in("health", filters.health);
  if (filters.priority?.length) query = query.in("priority", filters.priority);

  const { data, error } = await query;
  if (error) throw formatDbError(error);
  return data ?? [];
}

export async function listCommitmentAnalyticsOverview(filters: CommitmentAnalyticsFilters = {}) {
  return (await queryAnalyticsView("v_commitment_analytics_overview", filters)) as DbCommitmentAnalyticsOverview[];
}

export async function listOverdueCommitments(filters: CommitmentAnalyticsFilters = {}) {
  return (await queryAnalyticsView("v_commitment_overdue", filters)) as DbCommitmentAnalyticsOverview[];
}

export async function listCommitmentsMissingEvidence(filters: CommitmentAnalyticsFilters = {}) {
  return (await queryAnalyticsView("v_commitment_missing_evidence", filters)) as DbCommitmentAnalyticsOverview[];
}

export async function listCommitmentRenegotiationPressure(filters: CommitmentAnalyticsFilters = {}) {
  return (await queryAnalyticsView("v_commitment_renegotiation_pressure", filters)) as DbCommitmentAnalyticsOverview[];
}

export async function listDecisionsWithoutExecution(tenantId?: string) {
  let query = supabase.from("v_commitment_decisions_without_execution").select("*").order("effective_at", { ascending: false });
  if (tenantId) query = query.eq("tenant_id", tenantId);

  const { data, error } = await query;
  if (error) throw formatDbError(error);
  return (data ?? []) as DbDecisionWithoutExecution[];
}
