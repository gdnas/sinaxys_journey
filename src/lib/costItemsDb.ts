import { supabase } from "@/integrations/supabase/client";

export type CostItem = {
  id: string;
  company_id: string;
  name: string;
  category: string | null;
  type: "fixed" | "variable";
  billing_cycle: "monthly" | "annual" | "one_time";
  total_monthly_cost: number;
  is_shared: boolean;
  allocation_method: "manual" | "headcount";
  owner_department_id: string | null;
  competence_month: number | null;
  competence_year: number | null;
  active: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type CostAllocation = {
  id: string;
  company_id: string;
  cost_item_id: string;
  department_id: string;
  allocation_percentage: number;
  created_at: string;
  updated_at: string;
  department_name?: string;
};

export type CostItemWithAllocations = CostItem & {
  allocations?: CostAllocation[];
};

export async function listCostItems(
  companyId: string,
  includeInactive = false,
): Promise<CostItem[]> {
  let query = supabase
    .from("cost_items")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (!includeInactive) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as CostItem[];
}

export async function getCostItem(id: string): Promise<CostItem> {
  const { data, error } = await supabase
    .from("cost_items")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as CostItem;
}

export async function getCostItemWithAllocations(
  id: string,
): Promise<CostItemWithAllocations> {
  const { data, error } = await supabase
    .from("cost_items")
    .select("*, cost_allocations(*)")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as CostItemWithAllocations;
}

export async function createCostItem(
  data: Partial<CostItem> & {
    company_id: string;
    name: string;
    type: "fixed" | "variable";
    total_monthly_cost: number;
    allocations?: Array<{
      department_id: string;
      allocation_percentage: number;
    }>;
  },
): Promise<CostItem> {
  // Create cost item
  const { data: costItem, error: createError } = await supabase
    .from("cost_items")
    .insert({
      company_id: data.company_id,
      name: data.name,
      category: data.category,
      type: data.type,
      billing_cycle: data.billing_cycle || "monthly",
      total_monthly_cost: data.total_monthly_cost,
      is_shared: data.is_shared || false,
      allocation_method: data.allocation_method || "manual",
      owner_department_id: data.owner_department_id,
      competence_month: data.competence_month,
      competence_year: data.competence_year,
      active: data.active !== undefined ? data.active : true,
      notes: data.notes,
    })
    .select()
    .single();

  if (createError) throw createError;

  // If allocations are provided, use the RPC to set them
  if (data.allocations && data.allocations.length > 0) {
    const { error: rpcError } = await supabase.rpc("set_cost_allocations_safe", {
      p_cost_item_id: costItem.id,
      p_allocations: data.allocations,
    });

    if (rpcError) {
      // Rollback: delete the cost item if allocations failed
      await supabase.from("cost_items").delete().eq("id", costItem.id);
      throw rpcError;
    }
  }

  return costItem as CostItem;
}

export async function updateCostItem(
  id: string,
  data: Partial<CostItem> & {
    allocations?: Array<{
      department_id: string;
      allocation_percentage: number;
    }>;
  },
): Promise<CostItem> {
  // Update cost item
  const { data: costItem, error: updateError } = await supabase
    .from("cost_items")
    .update({
      name: data.name,
      category: data.category,
      type: data.type,
      billing_cycle: data.billing_cycle,
      total_monthly_cost: data.total_monthly_cost,
      is_shared: data.is_shared,
      allocation_method: data.allocation_method,
      owner_department_id: data.owner_department_id,
      competence_month: data.competence_month,
      competence_year: data.competence_year,
      active: data.active,
      notes: data.notes,
    })
    .eq("id", id)
    .select()
    .single();

  if (updateError) throw updateError;

  // If allocations are provided, use the RPC to set them
  if (data.allocations !== undefined) {
    const { error: rpcError } = await supabase.rpc("set_cost_allocations_safe", {
      p_cost_item_id: id,
      p_allocations: data.allocations,
    });

    if (rpcError) throw rpcError;
  }

  return costItem as CostItem;
}

export async function deleteCostItem(id: string): Promise<void> {
  const { error } = await supabase
    .from("cost_items")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function listCostAllocations(
  costItemId: string,
): Promise<CostAllocation[]> {
  const { data, error } = await supabase
    .from("cost_allocations")
    .select("*, departments(name)")
    .eq("cost_item_id", costItemId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data || []).map((allocation) => ({
    ...allocation,
    department_name: (allocation as any).departments?.name,
  })) as CostAllocation[];
}

export async function setCostAllocations(
  costItemId: string,
  allocations: Array<{
    department_id: string;
    allocation_percentage: number;
  }>,
): Promise<void> {
  const { error } = await supabase.rpc("set_cost_allocations_safe", {
    p_cost_item_id: costItemId,
    p_allocations: allocations,
  });

  if (error) throw error;
}

export async function suggestHeadcountAllocations(
  companyId: string,
): Promise<Array<{ department_id: string; allocation_percentage: number }>> {
  const { data, error } = await supabase.rpc(
    "suggest_headcount_allocations",
    {
      p_company_id: companyId,
    },
  );

  if (error) {
    // If the function doesn't exist yet, calculate manually
    const { data: profiles } = await supabase
      .from("profiles")
      .select("department_id")
      .eq("company_id", companyId)
      .eq("active", true);

    const deptCounts = new Map<string, number>();
    (profiles || []).forEach((p: any) => {
      if (p.department_id) {
        deptCounts.set(
          p.department_id,
          (deptCounts.get(p.department_id) || 0) + 1,
        );
      }
    });

    const totalHeadcount = Array.from(deptCounts.values()).reduce(
      (a, b) => a + b,
      0,
    );

    const allocations: Array<{
      department_id: string;
      allocation_percentage: number;
    }> = [];
    let remainingPercentage = 100;

    let index = 0;
    for (const [deptId, count] of deptCounts.entries()) {
      const isLast = index === deptCounts.size - 1;
      const percentage = isLast
        ? remainingPercentage
        : Math.round((count / totalHeadcount) * 100 * 100) / 100;

      allocations.push({ department_id: deptId, allocation_percentage: percentage });
      remainingPercentage -= percentage;
      index++;
    }

    return allocations;
  }

  return (data || []) as Array<{
    department_id: string;
    allocation_percentage: number;
  }>;
}

export async function recalculateByHeadcount(
  costItemId: string,
): Promise<Array<{ department_id: string; allocation_percentage: number }>> {
  const costItem = await getCostItem(costItemId);
  return suggestHeadcountAllocations(costItem.company_id);
}

export interface DepartmentCost {
  department_id: string;
  department_name: string;
  people_cost: number;
  expense_cost: number;
  total_cost: number;
  people_count: number;
}

export async function calculateDepartmentCosts(
  companyId: string,
): Promise<DepartmentCost[]> {
  const { data, error } = await supabase.rpc("calculate_department_costs", {
    p_company_id: companyId,
  });

  if (error) {
    // Fallback if function doesn't exist yet
    const { data: departments } = await supabase
      .from("departments")
      .select("*")
      .eq("company_id", companyId);

    const { data: profiles } = await supabase
      .from("profiles")
      .select("*")
      .eq("company_id", companyId)
      .eq("active", true);

    const { data: costItems } = await supabase
      .from("cost_items")
      .select("*, cost_allocations(*)")
      .eq("company_id", companyId)
      .eq("active", true);

    const deptCosts = new Map<string, DepartmentCost>();

    (departments || []).forEach((dept: any) => {
      deptCosts.set(dept.id, {
        department_id: dept.id,
        department_name: dept.name,
        people_cost: 0,
        expense_cost: 0,
        total_cost: 0,
        people_count: 0,
      });
    });

    // Calculate people costs
    (profiles || []).forEach((profile: any) => {
      if (profile.department_id && profile.monthly_cost_brl) {
        const cost = deptCosts.get(profile.department_id);
        if (cost) {
          cost.people_cost += Number(profile.monthly_cost_brl) || 0;
          cost.people_count += 1;
        }
      }
    });

    // Calculate expense costs
    (costItems || []).forEach((item: any) => {
      (item.cost_allocations || []).forEach((alloc: any) => {
        const cost = deptCosts.get(alloc.department_id);
        if (cost && item.total_monthly_cost) {
          cost.expense_cost +=
            (alloc.allocation_percentage / 100) * Number(item.total_monthly_cost);
        }
      });
    });

    // Calculate totals
    deptCosts.forEach((cost) => {
      cost.total_cost = cost.people_cost + cost.expense_cost;
    });

    return Array.from(deptCosts.values()).sort((a, b) => b.total_cost - a.total_cost);
  }

  return (data || []) as DepartmentCost[];
}

export async function calculateTotalCompanyCost(
  companyId: string,
): Promise<{
  total_people_cost: number;
  total_expense_cost: number;
  total_cost: number;
  total_people_count: number;
}> {
  const deptCosts = await calculateDepartmentCosts(companyId);

  const total_people_cost = deptCosts.reduce(
    (sum, dept) => sum + dept.people_cost,
    0,
  );
  const total_expense_cost = deptCosts.reduce(
    (sum, dept) => sum + dept.expense_cost,
    0,
  );
  const total_cost = deptCosts.reduce((sum, dept) => sum + dept.total_cost, 0);
  const total_people_count = deptCosts.reduce(
    (sum, dept) => sum + dept.people_count,
    0,
  );

  return {
    total_people_cost,
    total_expense_cost,
    total_cost,
    total_people_count,
  };
}
