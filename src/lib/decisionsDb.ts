import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/errorMessage";
import { type DecisionStatus, type DecisionType, decisionStatusValues, decisionTypeValues } from "@/lib/commitmentsDomain";

export interface DbCommitmentDecision {
  id: string;
  tenant_id: string;
  title: string;
  description: string | null;
  decision_type: DecisionType;
  status: DecisionStatus;
  decided_by_user_id: string | null;
  decided_by_team_id: string | null;
  effective_at: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CommitmentDecisionFilters {
  tenant_id?: string;
  decision_type?: DecisionType[];
  status?: DecisionStatus[];
  created_by?: string;
}

export interface CreateCommitmentDecisionInput {
  tenant_id: string;
  title: string;
  description?: string | null;
  decision_type: DecisionType;
  status?: DecisionStatus;
  decided_by_user_id?: string | null;
  decided_by_team_id?: string | null;
  effective_at?: string | null;
  created_by: string;
}

const decisionSelect = "id,tenant_id,title,description,decision_type,status,decided_by_user_id,decided_by_team_id,effective_at,created_by,created_at,updated_at";

function formatDbError(error: unknown) {
  return new Error(getErrorMessage(error));
}

export async function listCommitmentDecisions(filters: CommitmentDecisionFilters = {}) {
  let query = supabase.from("commitment_decisions").select(decisionSelect).order("created_at", { ascending: false });

  if (filters.tenant_id) query = query.eq("tenant_id", filters.tenant_id);
  if (filters.created_by) query = query.eq("created_by", filters.created_by);
  if (filters.decision_type?.length) query = query.in("decision_type", filters.decision_type);
  if (filters.status?.length) query = query.in("status", filters.status);

  const { data, error } = await query;
  if (error) throw formatDbError(error);
  return (data ?? []) as DbCommitmentDecision[];
}

export async function getCommitmentDecision(decisionId: string) {
  const { data, error } = await supabase.from("commitment_decisions").select(decisionSelect).eq("id", decisionId).maybeSingle();
  if (error) throw formatDbError(error);
  return (data ?? null) as DbCommitmentDecision | null;
}

export async function createCommitmentDecision(input: CreateCommitmentDecisionInput) {
  if (!decisionTypeValues.includes(input.decision_type)) {
    throw new Error("Tipo de decisão inválido.");
  }

  const status = input.status ?? "approved";
  if (!decisionStatusValues.includes(status)) {
    throw new Error("Status de decisão inválido.");
  }

  const payload = {
    tenant_id: input.tenant_id,
    title: input.title.trim(),
    description: input.description ?? null,
    decision_type: input.decision_type,
    status,
    decided_by_user_id: input.decided_by_user_id ?? null,
    decided_by_team_id: input.decided_by_team_id ?? null,
    effective_at: input.effective_at ?? null,
    created_by: input.created_by,
  };

  const { data, error } = await supabase.from("commitment_decisions").insert(payload).select(decisionSelect).single();
  if (error) throw formatDbError(error);
  return data as DbCommitmentDecision;
}

export async function updateCommitmentDecision(decisionId: string, patch: Partial<Omit<CreateCommitmentDecisionInput, "tenant_id" | "created_by">>) {
  const update: Record<string, unknown> = {};
  if (Object.prototype.hasOwnProperty.call(patch, "title")) update.title = patch.title?.trim();
  if (Object.prototype.hasOwnProperty.call(patch, "description")) update.description = patch.description ?? null;
  if (Object.prototype.hasOwnProperty.call(patch, "decision_type")) update.decision_type = patch.decision_type;
  if (Object.prototype.hasOwnProperty.call(patch, "status")) update.status = patch.status;
  if (Object.prototype.hasOwnProperty.call(patch, "decided_by_user_id")) update.decided_by_user_id = patch.decided_by_user_id ?? null;
  if (Object.prototype.hasOwnProperty.call(patch, "decided_by_team_id")) update.decided_by_team_id = patch.decided_by_team_id ?? null;
  if (Object.prototype.hasOwnProperty.call(patch, "effective_at")) update.effective_at = patch.effective_at ?? null;

  const { data, error } = await supabase.from("commitment_decisions").update(update).eq("id", decisionId).select(decisionSelect).single();
  if (error) throw formatDbError(error);
  return data as DbCommitmentDecision;
}
