import { supabase } from "@/integrations/supabase/client";

export const COMPANY_WIDE_DEPARTMENT_NAME = "Empresa toda";

export type DbDepartment = {
  id: string;
  company_id: string;
  name: string;
  created_at: string | null;
};

/**
 * MVP approach for "sem departamento": we create a special department row per company.
 * This keeps current DB constraints (learning_tracks.department_id is NOT NULL).
 */
export async function getOrCreateCompanyWideDepartment(companyId: string) {
  const { data: existing, error: selErr } = await supabase
    .from("departments")
    .select("id,company_id,name,created_at")
    .eq("company_id", companyId)
    .eq("name", COMPANY_WIDE_DEPARTMENT_NAME)
    .maybeSingle();

  if (selErr) throw selErr;
  if (existing) return existing as DbDepartment;

  const { data: created, error: insErr } = await supabase
    .from("departments")
    .insert({ company_id: companyId, name: COMPANY_WIDE_DEPARTMENT_NAME })
    .select("id,company_id,name,created_at")
    .single();

  if (insErr) throw insErr;
  return created as DbDepartment;
}
