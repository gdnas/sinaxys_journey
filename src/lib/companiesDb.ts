import { supabase } from "@/integrations/supabase/client";

export type DbCompany = {
  id: string;
  name: string;
  tagline: string | null;
  logo_data_url: string | null;
  colors: any;
  created_at: string | null;
};

export async function listCompanies() {
  const { data, error } = await supabase
    .from("companies")
    .select("id,name,tagline,logo_data_url,colors,created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbCompany[];
}

export async function getCompany(companyId: string) {
  const { data, error } = await supabase
    .from("companies")
    .select("id,name,tagline,logo_data_url,colors,created_at")
    .eq("id", companyId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as DbCompany | null;
}

export async function createCompany(params: { name: string; tagline?: string }) {
  const { data, error } = await supabase
    .from("companies")
    .insert({ name: params.name.trim(), tagline: params.tagline?.trim() || null })
    .select("id,name,tagline,logo_data_url,colors,created_at")
    .single();
  if (error) throw error;
  return data as DbCompany;
}

export async function updateCompany(companyId: string, patch: Partial<Pick<DbCompany, "name" | "tagline" | "logo_data_url" | "colors">>) {
  const { data, error } = await supabase
    .from("companies")
    .update(patch)
    .eq("id", companyId)
    .select("id,name,tagline,logo_data_url,colors,created_at")
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as DbCompany | null;
}

export async function deleteCompany(companyId: string) {
  const { error } = await supabase.from("companies").delete().eq("id", companyId);
  if (error) throw error;
}