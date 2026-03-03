import { supabase } from "@/integrations/supabase/client";

export type PublicProfileRow = {
  id: string;
  company_id: string;
  department_id: string | null;
  name: string;
  avatar_url: string | null;
  role: string;
  active: boolean;
  manager_id: string | null;
  job_title: string | null;
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

const baseSelect = "id,company_id,department_id,name,avatar_url,role,active,manager_id,job_title,updated_at";

export async function listPublicProfiles(companyId: string) {
  const { data, error } = await supabase
    .from("profile_public")
    .select(baseSelect)
    .eq("company_id", companyId)
    .eq("active", true)
    .order("name", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as PublicProfileRow[];
}

// Points rules
export async function listPointsRules(companyId: string) {
  const { data, error } = await supabase
    .from("points_rules")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PointsRuleRow[];
}

export async function createPointsRule(
  payload: Omit<PointsRuleRow, "id" | "created_at">
) {
  // Prefer admin RPC (enforces role checks). Fallback to direct insert if RPC not available.
  try {
    const { data, error } = await supabase.rpc("admin_create_points_rule", {
      p_company_id: payload.company_id,
      p_key: payload.key,
      p_category: payload.category,
      p_label: payload.label,
      p_points: payload.points,
      p_description: payload.description,
      p_active: payload.active ?? true,
    });
    if (error) throw error;
    if (data && Array.isArray(data) && data.length) return data[0] as PointsRuleRow;
  } catch (e) {
    // ignore and fallback
  }

  const { data, error } = await supabase
    .from("points_rules")
    .insert({
      company_id: payload.company_id,
      key: payload.key,
      category: payload.category,
      label: payload.label,
      points: payload.points,
      description: payload.description,
      active: payload.active ?? true,
    })
    .select()
    .single();

  if (error) throw error;
  return data as PointsRuleRow;
}

export async function updatePointsRule(
  ruleId: string,
  patch: Partial<Pick<PointsRuleRow, "points" | "active">>
) {
  // Prefer admin RPC (enforces role checks). Fallback to direct update if RPC not available.
  try {
    const { data, error } = await supabase.rpc("admin_update_points_rule", {
      p_rule_id: ruleId,
      p_points: typeof patch.points === "number" ? patch.points : null,
      p_active: typeof patch.active === "boolean" ? patch.active : null,
    });
    if (!error && data && Array.isArray(data) && data.length) return data[0] as PointsRuleRow;
  } catch (e) {
    // ignore and fallback
  }

  const { data, error } = await supabase
    .from("points_rules")
    .update(patch)
    .eq("id", ruleId)
    .select()
    .single();

  if (error) throw error;
  return data as PointsRuleRow;
}

export async function updatePointsRuleDirect(ruleId: string, patch: Partial<Pick<PointsRuleRow, "points" | "active">>) {
  const { data, error } = await supabase
    .from("points_rules")
    .update(patch)
    .eq("id", ruleId)
    .select()
    .single();

  if (error) throw error;
  return data as PointsRuleRow;
}

// Reward tiers
export async function listRewardTiers(companyId: string) {
  const { data, error } = await supabase
    .from("reward_tiers")
    .select("*")
    .eq("company_id", companyId)
    .order("min_points", { ascending: true });

  if (error) throw error;
  return (data ?? []) as RewardTierRow[];
}

export async function createRewardTier(
  payload: Omit<RewardTierRow, "id" | "created_at">
) {
  // Prefer admin RPC (enforces role checks). Fallback to direct insert if RPC not available.
  try {
    const { data, error } = await supabase.rpc("admin_create_reward_tier", {
      p_company_id: payload.company_id,
      p_name: payload.name,
      p_min_points: payload.min_points,
      p_prize: payload.prize,
      p_description: payload.description,
      p_active: payload.active ?? true,
    });
    if (error) throw error;
    // RPC returns the created row
    if (data && Array.isArray(data) && data.length) return data[0] as RewardTierRow;
  } catch (e) {
    // ignore and fallback
  }

  const { data, error } = await supabase
    .from("reward_tiers")
    .insert({
      company_id: payload.company_id,
      name: payload.name,
      min_points: payload.min_points,
      prize: payload.prize,
      description: payload.description,
      active: payload.active ?? true,
    })
    .select()
    .single();

  if (error) throw error;
  return data as RewardTierRow;
}

export async function updateRewardTier(
  tierId: string,
  patch: Partial<Pick<RewardTierRow, "active">>
) {
  // Prefer admin RPC
  try {
    const { data, error } = await supabase.rpc("admin_update_reward_tier", { p_tier_id: tierId, p_active: patch.active ?? null });
    if (error) throw error;
    if (data && Array.isArray(data) && data.length) return data[0] as RewardTierRow;
  } catch (e) {
    // ignore and fallback
  }

  const { data, error } = await supabase
    .from("reward_tiers")
    .update(patch)
    .eq("id", tierId)
    .select()
    .single();

  if (error) throw error;
  return data as RewardTierRow;
}

export async function deleteRewardTier(tierId: string) {
  // Prefer admin RPC
  try {
    const { error } = await supabase.rpc("admin_delete_reward_tier", { p_tier_id: tierId });
    if (!error) return;
  } catch (e) {
    // ignore and fallback
  }

  const { error } = await supabase
    .from("reward_tiers")
    .delete()
    .eq("id", tierId);

  if (error) throw error;
}

// Points events
export async function getMyPointsEvents(
  companyId: string,
  userId: string,
  limit: number = 50
) {
  const { data, error } = await supabase
    .from("points_events")
    .select("*")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as PointsEventRow[];
}

export async function addPointsBonus(params: {
  companyId: string;
  userId: string;
  points: number;
  note?: string | null;
}) {
  const { error } = await supabase.rpc("add_points_bonus", {
    p_user_id: params.userId,
    p_points: params.points,
    p_note: params.note ?? null,
  });

  if (error) throw error;
}

// Leaderboard
export async function fetchLeaderboard(
  companyId: string,
  limit: number = 50
) {
  // Prefer the denormalized profiles.total_points column (added for fast reads).
  // Fall back to the existing RPC when the column/table isn't available or the query fails.
  try {
    const { data, error } = await supabase
      .from("profiles")
      .select("id: id, total_points")
      .eq("company_id", companyId)
      .eq("active", true)
      .order("total_points", { ascending: false })
      .limit(limit as number);

    if (!error && data) {
      // Map rows to LeaderboardRow
      return (data as any[]).map((r) => ({ user_id: r.id as string, total_points: Number(r.total_points ?? 0) } as LeaderboardRow));
    }
  } catch (e) {
    // ignore and fallback
  }

  // Fallback to RPC (existing behavior)
  const { data, error } = await supabase.rpc("points_leaderboard", {
    p_company_id: companyId,
    p_limit: limit,
  });

  if (error) throw error;
  return (data ?? []) as LeaderboardRow[];
}