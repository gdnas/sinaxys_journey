import { supabase } from "@/integrations/supabase/client";

export type VacationStatus = "PENDING" | "APPROVED" | "REJECTED";

export type DbVacationRequest = {
  id: string;
  company_id: string;
  user_id: string;
  start_date: string; // yyyy-MM-dd
  days: number;
  status: VacationStatus;
  request_note: string | null;
  created_at: string;
  updated_at: string;
  decided_at: string | null;
  decided_by_user_id: string | null;
  decision_note: string | null;
};

const baseSelect =
  "id,company_id,user_id,start_date,days,status,request_note,created_at,updated_at,decided_at,decided_by_user_id,decision_note";

export async function listMyVacationRequests(companyId: string, userId: string) {
  const { data, error } = await supabase
    .from("vacation_requests")
    .select(baseSelect)
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbVacationRequest[];
}

export async function createVacationRequest(payload: {
  companyId: string;
  userId: string;
  startDate: string; // yyyy-MM-dd
  days: number;
  requestNote?: string;
}) {
  const { data, error } = await supabase
    .from("vacation_requests")
    .insert({
      company_id: payload.companyId,
      user_id: payload.userId,
      start_date: payload.startDate,
      days: Math.max(1, Math.floor(payload.days)),
      request_note: payload.requestNote?.trim() || null,
      status: "PENDING" satisfies VacationStatus,
    })
    .select(baseSelect)
    .single();

  if (error) throw error;
  return data as DbVacationRequest;
}

export async function cancelVacationRequest(id: string) {
  const { error } = await supabase.from("vacation_requests").delete().eq("id", id);
  if (error) throw error;
}

export async function listVacationRequestsForApprover(companyId: string) {
  const { data, error } = await supabase
    .from("vacation_requests")
    .select(baseSelect)
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbVacationRequest[];
}

export async function decideVacationRequest(payload: {
  id: string;
  status: Exclude<VacationStatus, "PENDING">;
  decidedByUserId: string;
  decisionNote?: string;
}) {
  const { data, error } = await supabase
    .from("vacation_requests")
    .update({
      status: payload.status,
      decided_at: new Date().toISOString(),
      decided_by_user_id: payload.decidedByUserId,
      decision_note: payload.decisionNote?.trim() || null,
    })
    .eq("id", payload.id)
    .select(baseSelect)
    .single();

  if (error) throw error;
  return data as DbVacationRequest;
}