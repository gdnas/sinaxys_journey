import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { getDefaultModuleEnabled, isCompanyModuleEnabled, type ModuleKey } from "@/lib/modulesDb";

export function useCompanyModuleEnabled(moduleKey: ModuleKey) {
  const { user } = useAuth();
  const { companyId } = useCompany();

  const shouldQuery = !!user && user.role !== "MASTERADMIN" && !!companyId;

  const q = useQuery({
    queryKey: ["company-module", companyId, moduleKey],
    enabled: shouldQuery,
    queryFn: () => isCompanyModuleEnabled(String(companyId), moduleKey),
    staleTime: 30_000,
  });

  // Master admins see everything (for now), and missing company context falls back to defaults.
  const enabled = user?.role === "MASTERADMIN" ? true : q.data ?? getDefaultModuleEnabled(moduleKey);

  return {
    enabled,
    isLoading: shouldQuery ? q.isLoading : false,
  };
}
