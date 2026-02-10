import { supabase } from "@/integrations/supabase/client";

export type ModuleKey = "PDI_PERFORMANCE" | (string & {});

export type DbCompanyModule = {
  company_id: string;
  module_key: string;
  enabled: boolean;
  created_at: string;
  updated_at: string;
};

export async function getCompanyModule(companyId: string, moduleKey: ModuleKey) {
  const { data, error } = await supabase
    .from("company_modules")
    .select("company_id,module_key,enabled,created_at,updated_at")
    .eq("company_id", companyId)
    .eq("module_key", moduleKey)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as DbCompanyModule | null;
}

export async function isCompanyModuleEnabled(companyId: string, moduleKey: ModuleKey) {
  const row = await getCompanyModule(companyId, moduleKey);
  return !!row?.enabled;
}

export async function setCompanyModuleEnabled(companyId: string, moduleKey: ModuleKey, enabled: boolean) {
  const { data, error } = await supabase
    .from("company_modules")
    .upsert(
      {
        company_id: companyId,
        module_key: moduleKey,
        enabled,
      },
      { onConflict: "company_id,module_key" },
    )
    .select("company_id,module_key,enabled,created_at,updated_at")
    .single();

  if (error) throw error;
  return data as DbCompanyModule;
}
