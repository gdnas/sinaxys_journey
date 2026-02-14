import { supabase } from "@/integrations/supabase/client";

export type DbObjectiveCostItem = {
  id: string;
  objective_id: string;
  title: string;
  amount_brl: number;
  notes: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

const select = "id,objective_id,title,amount_brl,notes,created_by_user_id,created_at,updated_at";

export async function listObjectiveCostItems(objectiveId: string) {
  const { data, error } = await supabase
    .from("okr_objective_cost_items")
    .select(select)
    .eq("objective_id", objectiveId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbObjectiveCostItem[];
}

export async function createObjectiveCostItem(payload: Pick<DbObjectiveCostItem, "objective_id" | "title" | "amount_brl"> & Partial<Pick<DbObjectiveCostItem, "notes" | "created_by_user_id">>) {
  const { data, error } = await supabase
    .from("okr_objective_cost_items")
    .insert({
      objective_id: payload.objective_id,
      title: payload.title.trim(),
      amount_brl: payload.amount_brl,
      notes: payload.notes ?? null,
      created_by_user_id: payload.created_by_user_id ?? null,
    })
    .select(select)
    .single();
  if (error) throw error;
  return data as DbObjectiveCostItem;
}

export async function deleteObjectiveCostItem(id: string) {
  const { error } = await supabase.from("okr_objective_cost_items").delete().eq("id", id);
  if (error) throw error;
}
