import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/errorMessage";
import { linkCommitmentExecution, type CreateCommitmentExecutionLinkInput, type DbCommitmentExecutionLink } from "@/lib/commitmentsDb";

export interface DbCommitmentProjectCompatibilityRow {
  execution_link_id: string;
  commitment_id: string;
  tenant_id: string;
  role: string;
  project_id: string;
  project_name: string;
  project_status: string;
  key_result_id: string | null;
  deliverable_id: string | null;
  owner_user_id: string;
  commitment_code: string;
  commitment_title: string;
  commitment_status: string;
  commitment_health: string;
}

function formatDbError(error: unknown) {
  return new Error(getErrorMessage(error));
}

export async function listProjectLinkedCommitments(projectId: string) {
  const { data, error } = await supabase
    .from("v_commitment_project_compatibility")
    .select("*")
    .eq("project_id", projectId)
    .order("commitment_code", { ascending: true });

  if (error) throw formatDbError(error);
  return (data ?? []) as DbCommitmentProjectCompatibilityRow[];
}

export async function listCommitmentLinkedProjects(commitmentId: string) {
  const { data, error } = await supabase
    .from("v_commitment_project_compatibility")
    .select("*")
    .eq("commitment_id", commitmentId)
    .order("project_name", { ascending: true });

  if (error) throw formatDbError(error);
  return (data ?? []) as DbCommitmentProjectCompatibilityRow[];
}

export async function attachCommitmentToProject(
  payload: Omit<CreateCommitmentExecutionLinkInput, "target_type"> & { project_id: string },
): Promise<DbCommitmentExecutionLink> {
  return linkCommitmentExecution({
    ...payload,
    target_type: "project",
  });
}
