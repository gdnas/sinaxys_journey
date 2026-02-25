import { supabase } from "@/integrations/supabase/client";

export type DbOkrKrObjectiveLink = {
  id: string;
  key_result_id: string;
  objective_id: string;
  created_at: string | null;
};

export async function listLinkedObjectivesByKrIds(krIds: string[]) {
  if (!krIds.length) return [] as DbOkrKrObjectiveLink[];
  const { data, error } = await supabase
    .from("okr_kr_objective_links")
    .select("id,key_result_id,objective_id,created_at")
    .in("key_result_id", krIds);

  if (error) throw error;
  return (data ?? []) as DbOkrKrObjectiveLink[];
}

export async function listKrLinksByObjectiveId(objectiveId: string) {
  const { data, error } = await supabase
    .from("okr_kr_objective_links")
    .select("id,key_result_id,objective_id,created_at")
    .eq("objective_id", objectiveId);

  if (error) throw error;
  return (data ?? []) as DbOkrKrObjectiveLink[];
}

export async function clearKrLinksForObjective(objectiveId: string) {
  const { error } = await supabase.from("okr_kr_objective_links").delete().eq("objective_id", objectiveId);
  if (error) throw error;
}

export async function linkObjectiveToKr(keyResultId: string, objectiveId: string) {
  const { data, error } = await supabase
    .from("okr_kr_objective_links")
    .insert({ key_result_id: keyResultId, objective_id: objectiveId })
    .select("id,key_result_id,objective_id,created_at")
    .single();

  if (error) throw error;
  return data as DbOkrKrObjectiveLink;
}

export async function unlinkObjectiveFromKr(linkId: string) {
  const { error } = await supabase.from("okr_kr_objective_links").delete().eq("id", linkId);
  if (error) throw error;
}