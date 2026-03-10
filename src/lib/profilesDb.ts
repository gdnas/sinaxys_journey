import { supabase } from "@/integrations/supabase/client";

export type DbProfile = {
  id: string;
  email: string;
  name: string | null;
  role: string;
  company_id: string | null;
  department_id: string | null;
  active: boolean;
  must_change_password: boolean;
  avatar_url: string | null;
  phone: string | null;
  job_title: string | null;
  contract_url: string | null;
  monthly_cost_brl: number | null;
  joined_at: string | null;
  manager_id: string | null;
  address_zip: string | null;
  address_line1: string | null;
  address_line2: string | null;
  address_neighborhood: string | null;
  address_city: string | null;
  address_state: string | null;
  address_country: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  created_at: string | null;
  updated_at: string | null;
  // new settings
  preferred_language?: string | null;
  theme_preference?: string | null;
  notification_preferences?: any;
};

export type DbProfilePublic = {
  id: string;
  company_id: string;
  department_id: string | null;
  name: string;
  avatar_url: string | null;
  role: string;
  active: boolean;
  updated_at: string;
  manager_id: string | null;
  job_title: string | null;
  joined_at: string | null;
};

const baseSelect =
  "id,email,name,role,company_id,department_id,active,must_change_password,avatar_url,phone,job_title,contract_url,monthly_cost_brl,joined_at,manager_id,address_zip,address_line1,address_line2,address_neighborhood,address_city,address_state,address_country,emergency_contact_name,emergency_contact_phone,created_at,updated_at,preferred_language,theme_preference,notification_preferences";

const publicSelect = "id,company_id,department_id,name,avatar_url,role,active,updated_at,manager_id,job_title,joined_at";

export async function getMyProfile() {
  const { data: u } = await supabase.auth.getUser();
  const uid = u.user?.id;
  if (!uid) return null;
  return getProfile(uid);
}

export async function getProfile(id: string) {
  const { data, error } = await supabase.from("profiles").select(baseSelect).eq("id", id).maybeSingle();
  if (error) throw error;
  return (data ?? null) as DbProfile | null;
}

export async function listProfilesByCompany(companyId: string) {
  const { data, error } = await supabase
    .from("profiles")[
      // NOTE: profiles contém dados sensíveis; o acesso é protegido por RLS.
      // Use profile_public quando você precisar apenas de dados públicos para listagem.
      "select"
    ](baseSelect)
    .eq("company_id", companyId)
    .order("name", { ascending: true, nullsFirst: false });
  if (error) throw error;
  return (data ?? []) as DbProfile[];
}

export async function listProfilePublicByCompany(companyId: string) {
  const { data, error } = await supabase.from("profile_public").select(publicSelect).eq("company_id", companyId).order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbProfilePublic[];
}

export async function listAllProfiles() {
  const { data, error } = await supabase.from("profiles").select(baseSelect).order("email", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbProfile[];
}

export async function updateProfile(id: string, patch: Partial<DbProfile>) {
  const { data, error } = await supabase.from("profiles").update(patch).eq("id", id).select(baseSelect).maybeSingle();
  if (error) throw error;
  return (data ?? null) as DbProfile | null;
}