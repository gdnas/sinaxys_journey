import { supabase } from "@/integrations/supabase/client";

export type DbProfilePublic = {
  id: string;
  company_id: string;
  department_id: string | null;
  name: string;
  avatar_url: string | null;
  role: string;
  active: boolean;
  manager_id: string | null;
  job_title: string | null;
  joined_at: string | null;
  updated_at: string;
};

const baseSelect = "id,company_id,department_id,name,avatar_url,role,active,manager_id,job_title,joined_at,updated_at";

export async function listPublicProfilesByCompany(companyId: string) {
  const { data, error } = await supabase
    .from("profile_public")
    .select(baseSelect)
    .eq("company_id", companyId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbProfilePublic[];
}

export async function getPublicProfile(profileId: string) {
  const { data, error } = await supabase.from("profile_public").select(baseSelect).eq("id", profileId).maybeSingle();
  if (error) throw error;
  return (data ?? null) as DbProfilePublic | null;
}