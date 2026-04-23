import { supabase } from "@/integrations/supabase/client";

// NOTE:
// - `company_modules` rows are optional.
// - If a row doesn't exist, we fall back to DEFAULT_ENABLED.
// - KAIROOS is sold as a modular platform: OKR is free; everything else is a paid add-on by default.

export type ModuleKey =
  | "PDI_PERFORMANCE"
  | "OKR"
  | "OKR_ROI"
  | "TRACKS"
  | "POINTS"
  | "COSTS"
  | "ORG"
  | "PROFILE"
  | "ADMIN"
  | "MASTER"
  | "KNOWLEDGE"
  | "INTERNAL_COMMUNICATION"
  | "PROJECTS"
  | "ASSETS"
  | "SQUAD_INTELLIGENCE"
  | "FINANCE"
  | (string & {});

const DEFAULT_ENABLED: Record<string, boolean> = {
  // Free
  OKR: true,

  // Paid add-ons (default locked)
  OKR_ROI: false,
  ORG: true,
  COSTS: true,
  TRACKS: false,
  POINTS: false,
  PDI_PERFORMANCE: false,
  KNOWLEDGE: false,
  INTERNAL_COMMUNICATION: false,
  PROJECTS: false,
  ASSETS: false,
  SQUAD_INTELLIGENCE: false,
  FINANCE: false,

  // Core areas (not sold as modules for now)
  PROFILE: true,
  ADMIN: true,
  MASTER: true,
};

export function getDefaultModuleEnabled(moduleKey: ModuleKey) {
  return DEFAULT_ENABLED[String(moduleKey)] ?? false;
}

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

export async function listCompanyModules(companyId: string) {
  const { data, error } = await supabase
    .from("company_modules")
    .select("company_id,module_key,enabled,created_at,updated_at")
    .eq("company_id", companyId);

  if (error) throw error;
  return (data ?? []) as DbCompanyModule[];
}

export async function isCompanyModuleEnabled(companyId: string, moduleKey: ModuleKey) {
  const row = await getCompanyModule(companyId, moduleKey);
  if (!row) return getDefaultModuleEnabled(moduleKey);
  return !!row.enabled;
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