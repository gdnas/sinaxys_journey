import { supabase } from "@/integrations/supabase/client";

export type UserAccessStat = {
  user_id: string;
  company_id: string | null;
  access_count: number;
  last_access_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const baseSelect = "user_id,company_id,access_count,last_access_at,created_at,updated_at";

export async function listAccessStatsByCompany(companyId: string) {
  const { data, error } = await supabase
    .from("user_access_stats")
    .select(baseSelect)
    .eq("company_id", companyId);
  if (error) throw error;
  return (data ?? []) as UserAccessStat[];
}

export async function listAllAccessStats() {
  const { data, error } = await supabase.from("user_access_stats").select(baseSelect);
  if (error) throw error;
  return (data ?? []) as UserAccessStat[];
}
