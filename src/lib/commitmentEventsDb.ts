import { supabase } from "@/integrations/supabase/client";
import { getErrorMessage } from "@/lib/errorMessage";
import type { CommitmentEventType } from "@/lib/commitmentTypes";

export interface DbCommitmentEventRow {
  id: string;
  tenant_id: string;
  commitment_id: string;
  event_type: CommitmentEventType | string;
  actor_user_id: string | null;
  causation_type: string | null;
  causation_id: string | null;
  payload: Record<string, unknown>;
  created_at: string;
}

export interface AppendCommitmentEventInput {
  commitment_id: string;
  event_type: CommitmentEventType;
  payload?: Record<string, unknown>;
  causation_type?: string | null;
  causation_id?: string | null;
  actor_user_id?: string | null;
}

const eventSelect = "id,tenant_id,commitment_id,event_type,actor_user_id,causation_type,causation_id,payload,created_at";

function formatDbError(error: unknown) {
  return new Error(getErrorMessage(error));
}

export async function listCommitmentTimeline(commitmentId: string) {
  const { data, error } = await supabase
    .from("commitment_events")
    .select(eventSelect)
    .eq("commitment_id", commitmentId)
    .order("created_at", { ascending: true });

  if (error) throw formatDbError(error);
  return (data ?? []) as DbCommitmentEventRow[];
}

export async function appendCommitmentEvent(input: AppendCommitmentEventInput) {
  const { data, error } = await supabase.rpc("commitment_log_event", {
    p_commitment_id: input.commitment_id,
    p_event_type: input.event_type,
    p_payload: input.payload ?? {},
    p_causation_type: input.causation_type ?? null,
    p_causation_id: input.causation_id ?? null,
    p_actor_user_id: input.actor_user_id ?? null,
  });

  if (error) throw formatDbError(error);
  return data as string;
}

export async function getCommitmentEvent(eventId: string) {
  const { data, error } = await supabase.from("commitment_events").select(eventSelect).eq("id", eventId).maybeSingle();
  if (error) throw formatDbError(error);
  return (data ?? null) as DbCommitmentEventRow | null;
}
