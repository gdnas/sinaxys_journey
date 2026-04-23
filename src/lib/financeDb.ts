import { supabase } from "@/integrations/supabase/client";

export async function trackFinanceModuleEnabled(companyId: string, userId: string) {
  const { error } = await supabase.from("audit_logs").insert({
    company_id: companyId,
    actor_user_id: userId,
    action: "finance_module_enabled",
    meta: {
      company_id: companyId,
      user_id: userId,
      timestamp: new Date().toISOString(),
    },
  });

  if (error) throw error;
}