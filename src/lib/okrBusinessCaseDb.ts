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

export type DbOkrObjectiveLaborAllocation = {
  id: string;
  objective_id: string;
  user_id: string;
  hours_estimated: number;
  role_label: string | null;
  notes: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

const costSelect = "id,objective_id,title,amount_brl,notes,created_by_user_id,created_at,updated_at";
const laborSelect = "id,objective_id,user_id,hours_estimated,role_label,notes,created_by_user_id,created_at,updated_at";

export async function listObjectiveCostItemsForObjectives(objectiveIds: string[]) {
  if (!objectiveIds.length) return [] as DbObjectiveCostItem[];
  const { data, error } = await supabase
    .from("okr_objective_cost_items")
    .select(costSelect)
    .in("objective_id", objectiveIds)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbObjectiveCostItem[];
}

export async function listObjectiveLaborAllocationsForObjectives(objectiveIds: string[]) {
  if (!objectiveIds.length) return [] as DbOkrObjectiveLaborAllocation[];
  const { data, error } = await supabase
    .from("okr_objective_labor_allocations")
    .select(laborSelect)
    .in("objective_id", objectiveIds)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbOkrObjectiveLaborAllocation[];
}
