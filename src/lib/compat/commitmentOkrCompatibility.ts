import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/errorMessage";
import type { StrategicContextType } from "@/lib/commitmentsDomain";

export interface DbCommitmentOkrCompatibilityRow {

  commitment_id: string;
  tenant_id: string;
  commitment_code: string;
  commitment_title: string;
  strategic_context_type: StrategicContextType | null;

  strategic_context_id: string | null;
  objective_id: string | null;
  key_result_id: string | null;
  project_id: string | null;
  work_item_id: string | null;
}

function formatDbError(error: unknown) {
  return new Error(getErrorMessage(error));
}

export async function listCommitmentOkrCompatibility(commitmentId: string) {
  const { data, error } = await supabase
    .from("v_commitment_okr_compatibility")
    .select("*")
    .eq("commitment_id", commitmentId)
    .order("commitment_code", { ascending: true });

  if (error) throw formatDbError(error);
  return (data ?? []) as DbCommitmentOkrCompatibilityRow[];
}

export async function listObjectiveCommitments(objectiveId: string) {
  const { data, error } = await supabase
    .from("v_commitment_okr_compatibility")
    .select("*")
    .eq("objective_id", objectiveId)
    .order("commitment_code", { ascending: true });

  if (error) throw formatDbError(error);
  return (data ?? []) as DbCommitmentOkrCompatibilityRow[];
}

export async function listKeyResultCommitments(keyResultId: string) {
  const { data, error } = await supabase
    .from("v_commitment_okr_compatibility")
    .select("*")
    .eq("key_result_id", keyResultId)
    .order("commitment_code", { ascending: true });

  if (error) throw formatDbError(error);
  return (data ?? []) as DbCommitmentOkrCompatibilityRow[];
}
