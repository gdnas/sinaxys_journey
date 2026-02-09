import { supabase } from "@/integrations/supabase/client";

export type PublicProfileRow = {
  id: string;
  company_id: string;
  department_id: string | null;
  name: string;
  avatar_url: string | null;
  role: string;
  active: boolean;
  updated_at: string;
};

export type PointsRuleRow = {
  id: string;
  company_id: string;
  key: string;
  category: string;
  label: string;
  points: number;
  description: string | null;
  active: boolean;
  created_at: string;
};

export type PointsEventRow = {
  id: string;
  company_id: string;
  user_id: string;
  rule_key: string;
  points: number;
  note: string | null;
  created_at: string;
  created_by_user_id: string | null;
  assignment_id: string | null;
  module_id: string | null;
};

export type RewardTierRow = {
  id: string;
  company_id: string;
  name: string;
  min_points: number;
  prize: string;
  description: string | null;
  active: boolean;
  created_at: string;
};

export type LeaderboardRow = {
  user_id: string;
  total_points: number;
};

export async function listPublicProfiles(companyId: string) {
  const { data, error } = await supabase
    .from("profile_public")
    .select("id,company_id,department_id,name,avatar_url,role,active,updated_at")
    .eq("company_id", companyId)
    .eq("active", true)
    .order("name", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as PublicProfileRow[];
}

export async function getMyPointsEvents(companyId: string, userId: string, limit = 30) {
  const { data, error } = await supabase
    .from("points_events")
    .select("id,company_id,user_id,rule_key,points,note,created_at,created_by_user_id,assignment_id,module_id")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as PointsEventRow[];
}

export async function listPointsRules(companyId: string) {
  const { data, error } = await supabase
    .from("points_rules")
    .select("id,company_id,key,category,label,points,description,active,created_at")
    .eq("company_id", companyId)
    .order("category", { ascending: true })
    .order("label", { ascending: true });

  if (error) throw error;
  return (data ?? []) as PointsRuleRow[];
}

export async function updatePointsRule(ruleId: string, patch: Partial<Pick<PointsRuleRow, "points" | "active" | "label" | "description" | "category">>) {
  const { data, error } = await supabase
    .from("points_rules")
    .update(patch)
    .eq("id", ruleId)
    .select("id,company_id,key,category,label,points,description,active,created_at")
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as PointsRuleRow | null;
}

export async function listRewardTiers(companyId: string) {
  const { data, error } = await supabase
    .from("reward_tiers")
    .select("id,company_id,name,min_points,prize,description,active,created_at")
    .eq("company_id", companyId)
    .order("min_points", { ascending: true });

  if (error) throw error;
  return (data ?? []) as RewardTierRow[];
}

export async function createRewardTier(input: { companyId: string; name: string; minPoints: number; prize: string; description?: string | null }) {
  const { data, error } = await supabase
    .from("reward_tiers")
    .insert({
      company_id: input.companyId,
      name: input.name,
      min_points: input.minPoints,
      prize: input.prize,
      description: input.description ?? null,
      active: true,
    })
    .select("id,company_id,name,min_points,prize,description,active,created_at")
    .single();

  if (error) throw error;
  return data as RewardTierRow;
}

export async function updateRewardTier(id: string, patch: Partial<Pick<RewardTierRow, "name" | "min_points" | "prize" | "description" | "active">>) {
  const { data, error } = await supabase
    .from("reward_tiers")
    .update(patch)
    .eq("id", id)
    .select("id,company_id,name,min_points,prize,description,active,created_at")
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as RewardTierRow | null;
}

export async function deleteRewardTier(id: string) {
  const { error } = await supabase.from("reward_tiers").delete().eq("id", id);
  if (error) throw error;
}

export async function fetchLeaderboard(companyId: string, limit = 50) {
  const { data, error } = await supabase.rpc("points_leaderboard", { p_company_id: companyId, p_limit: limit });
  if (error) throw error;
  return (data ?? []) as LeaderboardRow[];
}

export async function addPointsBonus(input: { userId: string; points: number; note?: string | null }) {
  const { error } = await supabase.rpc("add_points_bonus", { p_user_id: input.userId, p_points: input.points, p_note: input.note ?? null });
  if (error) throw error;
}
