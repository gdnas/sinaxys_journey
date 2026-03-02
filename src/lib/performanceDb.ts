import { supabase } from "@/integrations/supabase/client";

export type PerformanceScoreRow = {
  id: string;
  company_id: string;
  cycle_id: string;
  user_id: string;
  department_id: string | null;
  score: number;
  breakdown: Record<string, number> | null;
  created_at: string;
};

export async function listPerformanceScores(companyId: string, cycleId: string) {
  const { data, error } = await supabase
    .from("performance_scores")
    .select("id,company_id,cycle_id,user_id,department_id,score,breakdown,created_at")
    .eq("company_id", companyId)
    .eq("cycle_id", cycleId)
    .order("score", { ascending: false });

  if (error) throw error;
  return (data ?? []) as PerformanceScoreRow[];
}

export async function getPerformanceScore(companyId: string, userId: string, cycleId: string) {
  const { data, error } = await supabase
    .from("performance_scores")
    .select("id,company_id,cycle_id,user_id,department_id,score,breakdown,created_at")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .eq("cycle_id", cycleId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as PerformanceScoreRow | null;
}