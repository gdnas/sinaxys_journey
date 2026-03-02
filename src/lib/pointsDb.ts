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
  public: active: boolean;
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