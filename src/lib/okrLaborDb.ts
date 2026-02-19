import { supabase } from "@/integrations/supabase/client";

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

const select = "id,objective_id,user_id,hours_estimated,role_label,notes,created_by_user_id,created_at,updated_at";

export async function listObjectiveLaborAllocations(objectiveId: string) {
  const { data, error } = await supabase
    .from("okr_objective_labor_allocations")
    .select(select)
    .eq("objective_id", objectiveId)
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbOkrObjectiveLaborAllocation[];
}

export async function upsertObjectiveLaborAllocation(payload: {
  objective_id: string;
  user_id: string;
  hours_estimated: number;
  role_label?: string | null;
  notes?: string | null;
  created_by_user_id?: string | null;
}) {
  const { data, error } = await supabase
    .from("okr_objective_labor_allocations")
    .upsert(
      {
        objective_id: payload.objective_id,
        user_id: payload.user_id,
        hours_estimated: payload.hours_estimated,
        role_label: payload.role_label ?? null,
        notes: payload.notes ?? null,
        created_by_user_id: payload.created_by_user_id ?? null,
      },
      { onConflict: "objective_id,user_id" },
    )
    .select(select)
    .single();

  if (error) throw error;
  return data as DbOkrObjectiveLaborAllocation;
}

export async function deleteObjectiveLaborAllocation(id: string) {
  const { error } = await supabase.from("okr_objective_labor_allocations").delete().eq("id", id);
  if (error) throw error;
}
