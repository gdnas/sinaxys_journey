import { supabase } from "@/integrations/supabase/client";

export type Squad = {
  id: string;
  company_id: string;
  name: string;
  product: string | null;
  type: "core" | "growth" | "support" | null;
  owner_user_id: string | null;
  active: boolean;
  created_at: string;
  updated_at: string;
};

export type SquadMember = {
  id: string;
  company_id: string;
  squad_id: string;
  user_id: string;
  allocation_percentage: number;
  role: string | null;
  created_at: string;
  updated_at: string;
  // Joined data
  user_name?: string;
  user_email?: string;
  user_avatar_url?: string;
  user_job_title?: string;
  user_monthly_cost_brl?: number;
  user_department_id?: string;
  user_department_name?: string;
};

export type SquadWithMembers = Squad & {
  members?: SquadMember[];
  member_count?: number;
  total_cost?: number;
};

export async function listSquads(
  companyId: string,
  includeInactive = false,
): Promise<Squad[]> {
  let query = supabase
    .from("squads")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (!includeInactive) {
    query = query.eq("active", true);
  }

  const { data, error } = await query;

  if (error) throw error;
  return (data || []) as Squad[];
}

export async function getSquad(id: string): Promise<Squad> {
  const { data, error } = await supabase
    .from("squads")
    .select("*")
    .eq("id", id)
    .single();

  if (error) throw error;
  return data as Squad;
}

export async function getSquadWithMembers(
  id: string,
): Promise<SquadWithMembers> {
  const { data, error } = await supabase
    .from("squads")
    .select(
      "*, squad_members(*, profiles(name, email, avatar_url, job_title, monthly_cost_brl, department_id, departments(name)))",
    )
    .eq("id", id)
    .single();

  if (error) throw error;

  const squad = data as any;
  const members = squad.squad_members?.map((member: any) => ({
    ...member,
    user_name: member.profiles?.name,
    user_email: member.profiles?.email,
    user_avatar_url: member.profiles?.avatar_url,
    user_job_title: member.profiles?.job_title,
    user_monthly_cost_brl: member.profiles?.monthly_cost_brl,
    user_department_id: member.profiles?.department_id,
    user_department_name: member.profiles?.departments?.name,
  })) || [];

  const totalCost = members.reduce((sum: number, member: SquadMember) => {
    if (!member.user_monthly_cost_brl) return sum;
    return sum + (member.user_monthly_cost_brl * member.allocation_percentage) / 100;
  }, 0);

  return {
    ...squad,
    members,
    member_count: members.length,
    total_cost: totalCost,
  };
}

export async function createSquad(
  data: Partial<Squad> & {
    company_id: string;
    name: string;
  },
): Promise<Squad> {
  const { data: squad, error } = await supabase
    .from("squads")
    .insert({
      company_id: data.company_id,
      name: data.name,
      product: data.product,
      type: data.type,
      owner_user_id: data.owner_user_id,
      active: data.active !== undefined ? data.active : true,
    })
    .select()
    .single();

  if (error) throw error;
  return squad as Squad;
}

export async function updateSquad(
  id: string,
  data: Partial<Squad>,
): Promise<Squad> {
  const { data: squad, error } = await supabase
    .from("squads")
    .update({
      name: data.name,
      product: data.product,
      type: data.type,
      owner_user_id: data.owner_user_id,
      active: data.active,
    })
    .eq("id", id)
    .select()
    .single();

  if (error) throw error;
  return squad as Squad;
}

export async function deleteSquad(id: string): Promise<void> {
  const { error } = await supabase.from("squads").delete().eq("id", id);

  if (error) throw error;
}

export async function listSquadMembers(
  squadId: string,
): Promise<SquadMember[]> {
  const { data, error } = await supabase
    .from("squad_members")
    .select(
      "*, profiles(name, email, avatar_url, job_title, monthly_cost_brl, department_id, departments(name))",
    )
    .eq("squad_id", squadId)
    .order("created_at", { ascending: true });

  if (error) throw error;

  return (data || []).map((member: any) => ({
    ...member,
    user_name: member.profiles?.name,
    user_email: member.profiles?.email,
    user_avatar_url: member.profiles?.avatar_url,
    user_job_title: member.profiles?.job_title,
    user_monthly_cost_brl: member.profiles?.monthly_cost_brl,
    user_department_id: member.profiles?.department_id,
    user_department_name: member.profiles?.departments?.name,
  })) as SquadMember[];
}

export async function addSquadMember(
  squadId: string,
  userId: string,
  allocationPercentage: number,
  role?: string,
): Promise<SquadMember> {
  const { data, error } = await supabase.rpc("add_squad_member_safe", {
    p_squad_id: squadId,
    p_user_id: userId,
    p_allocation_percentage: allocationPercentage,
    p_role: role || null,
  });

  if (error) throw error;
  return data as SquadMember;
}

export async function updateSquadMember(
  memberId: string,
  allocationPercentage: number,
  role?: string,
): Promise<SquadMember> {
  const { data, error } = await supabase.rpc("update_squad_member_safe", {
    p_member_id: memberId,
    p_allocation_percentage: allocationPercentage,
    p_role: role || null,
  });

  if (error) throw error;
  return data as SquadMember;
}

export async function removeSquadMember(memberId: string): Promise<void> {
  const { error } = await supabase
    .from("squad_members")
    .delete()
    .eq("id", memberId);

  if (error) throw error;
}

export async function getUserAllocationSum(
  userId: string,
  excludeSquadId?: string,
): Promise<number> {
  let query = supabase
    .from("squad_members")
    .select("allocation_percentage")
    .eq("user_id", userId);

  if (excludeSquadId) {
    query = query.neq("squad_id", excludeSquadId);
  }

  const { data, error } = await query;

  if (error) throw error;

  return (data || []).reduce(
    (sum, member) => sum + (member.allocation_percentage || 0),
    0,
  );
}

export async function getUserSquads(userId: string): Promise<
  Array<{
    squad_id: string;
    squad_name: string;
    allocation_percentage: number;
    role: string | null;
  }>
> {
  const { data, error } = await supabase
    .from("squad_members")
    .select("squad_id, allocation_percentage, role, squads(name)")
    .eq("user_id", userId);

  if (error) throw error;

  return (data || []).map((item: any) => ({
    squad_id: item.squad_id,
    squad_name: item.squads?.name || "Unknown",
      allocation_percentage: item.allocation_percentage,
      role: item.role,
    }));
}

export async function calculateSquadCost(squadId: string): Promise<number> {
  const squad = await getSquadWithMembers(squadId);
  return squad.total_cost || 0;
}

export async function calculateAllSquadCosts(
  companyId: string,
): Promise<
  Array<{
    squad_id: string;
    squad_name: string;
    squad_type: string | null;
    member_count: number;
    total_cost: number;
  }>
> {
  const { data, error } = await supabase
    .from("squads")
    .select(
      "id, name, type, squad_members(user_id, allocation_percentage, profiles(monthly_cost_brl))",
    )
    .eq("company_id", companyId)
    .eq("active", true);

  if (error) throw error;

  return (data || []).map((squad: any) => {
    const totalCost = (squad.squad_members || []).reduce(
      (sum: number, member: any) => {
        if (!member.profiles?.monthly_cost_brl) return sum;
        return (
          sum +
          (member.profiles.monthly_cost_brl * member.allocation_percentage) / 100
        );
      },
      0,
    );

    return {
      squad_id: squad.id,
      squad_name: squad.name,
      squad_type: squad.type,
      member_count: squad.squad_members?.length || 0,
      total_cost: totalCost,
    };
  });
}