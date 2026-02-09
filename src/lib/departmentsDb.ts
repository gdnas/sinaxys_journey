import { supabase } from "@/integrations/supabase/client";

export type DbDepartment = {
  id: string;
  company_id: string;
  name: string;
  created_at: string | null;
};

export async function listDepartments(companyId: string) {
  const { data, error } = await supabase
    .from("departments")
    .select("id,company_id,name,created_at")
    .eq("company_id", companyId)
    .order("name", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbDepartment[];
}

export async function createDepartment(companyId: string, name: string) {
  const { data, error } = await supabase
    .from("departments")
    .insert({ company_id: companyId, name: name.trim() })
    .select("id,company_id,name,created_at")
    .single();
  if (error) throw error;
  return data as DbDepartment;
}

export async function updateDepartment(departmentId: string, name: string) {
  const { data, error } = await supabase
    .from("departments")
    .update({ name: name.trim() })
    .eq("id", departmentId)
    .select("id,company_id,name,created_at")
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as DbDepartment | null;
}

export async function deleteDepartment(departmentId: string) {
  const { error } = await supabase.from("departments").delete().eq("id", departmentId);
  if (error) throw error;
}
