import { supabase } from "@/integrations/supabase/client";

export type PerformanceScore = {
  id: string;
  user_id: string;
  company_id: string;
  period: string;
  score: number;
  created_at: string;
};

export async function listPerformanceScores({ companyId, userId }: { companyId?: string; userId?: string }) {
  let query = supabase.from("performance_scores").select("*");

  if (companyId) {
    query = query.eq("company_id", companyId);
  }
  if (userId) {
    query = query.eq("user_id", userId);
  }

  const { data, error } = await query.order("period", { ascending: false });
  if (error) throw error;
  return (data ?? []) as PerformanceScore[];
}