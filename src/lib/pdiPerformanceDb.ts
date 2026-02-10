import { supabase } from "@/integrations/supabase/client";

export type DbPdiPlan = {
  id: string;
  tenant_id: string;
  user_id: string;
  career_goal: string | null;
  current_position: string | null;
  next_level: string | null;
  where_i_am: string | null;
  where_i_want: string | null;
  strengths: string | null;
  improvement_points: string | null;
  evolution_plan: string | null;
  target_date: string | null; // date
  created_at: string;
  updated_at: string;
};

export type DbPdiSkill = {
  id: string;
  tenant_id: string;
  plan_id: string;
  user_id: string;
  name: string;
  current_level: number;
  target_level: number;
  due_date: string | null; // date
  responsible_user_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

export type DbCheckin = {
  id: string;
  tenant_id: string;
  user_id: string;
  cadence: string;
  period_start: string | null; // date
  how_was_week: string | null;
  advances: string | null;
  difficulties: string | null;
  energy: number;
  motivation: number;
  needs_help: boolean;
  suggestions: string | null;
  created_at: string;
  updated_at: string;
};

export type DbOneOnOne = {
  id: string;
  tenant_id: string;
  employee_id: string;
  manager_id: string;
  occurred_at: string; // date
  topics: string | null;
  feedbacks: string | null;
  decisions: string | null;
  actions: string | null;
  attention_points: string | null;
  next_steps: string | null;
  created_by_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type FeedbackKind = "ELOGIO" | "RECONHECIMENTO" | "CONSTRUTIVO" | "ATENCAO";

export type DbFeedback = {
  id: string;
  tenant_id: string;
  from_user_id: string;
  to_user_id: string;
  kind: string;
  message: string;
  created_at: string;
};

export type DbCareerEvent = {
  id: string;
  tenant_id: string;
  user_id: string;
  event_type: string;
  title: string;
  description: string | null;
  occurred_at: string | null; // date
  meta: any;
  created_at: string;
  updated_at: string;
};

const NIL = "00000000-0000-0000-0000-000000000000";

// PDI
export async function getPdiPlan(tenantId: string, userId: string) {
  const { data, error } = await supabase
    .from("pdi_plans")
    .select(
      "id,tenant_id,user_id,career_goal,current_position,next_level,where_i_am,where_i_want,strengths,improvement_points,evolution_plan,target_date,created_at,updated_at",
    )
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as DbPdiPlan | null;
}

export async function ensurePdiPlan(tenantId: string, userId: string, seed?: { currentPosition?: string | null }) {
  const existing = await getPdiPlan(tenantId, userId);
  if (existing) return existing;

  const { data, error } = await supabase
    .from("pdi_plans")
    .insert({
      tenant_id: tenantId,
      user_id: userId,
      current_position: seed?.currentPosition ?? null,
    })
    .select(
      "id,tenant_id,user_id,career_goal,current_position,next_level,where_i_am,where_i_want,strengths,improvement_points,evolution_plan,target_date,created_at,updated_at",
    )
    .single();

  if (error) throw error;
  return data as DbPdiPlan;
}

export async function updatePdiPlan(planId: string, patch: Partial<Omit<DbPdiPlan, "id" | "tenant_id" | "user_id" | "created_at" | "updated_at">>) {
  const { data, error } = await supabase
    .from("pdi_plans")
    .update({
      career_goal: patch.career_goal ?? undefined,
      current_position: patch.current_position ?? undefined,
      next_level: patch.next_level ?? undefined,
      where_i_am: patch.where_i_am ?? undefined,
      where_i_want: patch.where_i_want ?? undefined,
      strengths: patch.strengths ?? undefined,
      improvement_points: patch.improvement_points ?? undefined,
      evolution_plan: patch.evolution_plan ?? undefined,
      target_date: patch.target_date ?? undefined,
    })
    .eq("id", planId)
    .select(
      "id,tenant_id,user_id,career_goal,current_position,next_level,where_i_am,where_i_want,strengths,improvement_points,evolution_plan,target_date,created_at,updated_at",
    )
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as DbPdiPlan | null;
}

export async function listPdiSkills(planId: string) {
  const { data, error } = await supabase
    .from("pdi_skills")
    .select(
      "id,tenant_id,plan_id,user_id,name,current_level,target_level,due_date,responsible_user_id,notes,created_at,updated_at",
    )
    .eq("plan_id", planId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as DbPdiSkill[];
}

export async function upsertPdiSkill(payload: {
  id?: string;
  tenantId: string;
  planId: string;
  userId: string;
  name: string;
  currentLevel: number;
  targetLevel: number;
  dueDate?: string | null;
  responsibleUserId?: string | null;
  notes?: string | null;
}) {
  const { data, error } = await supabase
    .from("pdi_skills")
    .upsert(
      {
        id: payload.id,
        tenant_id: payload.tenantId,
        plan_id: payload.planId,
        user_id: payload.userId,
        name: payload.name.trim(),
        current_level: Math.max(0, Math.min(10, Math.round(payload.currentLevel))),
        target_level: Math.max(0, Math.min(10, Math.round(payload.targetLevel))),
        due_date: payload.dueDate ?? null,
        responsible_user_id: payload.responsibleUserId ?? null,
        notes: payload.notes ?? null,
      },
      { onConflict: "id" },
    )
    .select(
      "id,tenant_id,plan_id,user_id,name,current_level,target_level,due_date,responsible_user_id,notes,created_at,updated_at",
    )
    .single();

  if (error) throw error;
  return data as DbPdiSkill;
}

export async function deletePdiSkill(skillId: string) {
  const { error } = await supabase.from("pdi_skills").delete().eq("id", skillId);
  if (error) throw error;
}

// Check-ins
export async function createCheckin(payload: {
  tenantId: string;
  userId: string;
  cadence: "WEEKLY" | "BIWEEKLY";
  periodStart?: string | null;
  howWasWeek: string;
  advances: string;
  difficulties: string;
  energy: number;
  motivation: number;
  needsHelp: boolean;
  suggestions: string;
}) {
  const { data, error } = await supabase
    .from("checkins")
    .insert({
      tenant_id: payload.tenantId,
      user_id: payload.userId,
      cadence: payload.cadence,
      period_start: payload.periodStart ?? null,
      how_was_week: payload.howWasWeek.trim() || null,
      advances: payload.advances.trim() || null,
      difficulties: payload.difficulties.trim() || null,
      energy: Math.max(0, Math.min(10, Math.round(payload.energy))),
      motivation: Math.max(0, Math.min(10, Math.round(payload.motivation))),
      needs_help: payload.needsHelp,
      suggestions: payload.suggestions.trim() || null,
    })
    .select(
      "id,tenant_id,user_id,cadence,period_start,how_was_week,advances,difficulties,energy,motivation,needs_help,suggestions,created_at,updated_at",
    )
    .single();

  if (error) throw error;
  return data as DbCheckin;
}

export async function listCheckinsForUser(tenantId: string, userId: string, opts?: { limit?: number }) {
  const { data, error } = await supabase
    .from("checkins")
    .select(
      "id,tenant_id,user_id,cadence,period_start,how_was_week,advances,difficulties,energy,motivation,needs_help,suggestions,created_at,updated_at",
    )
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(200, opts?.limit ?? 20)));

  if (error) throw error;
  return (data ?? []) as DbCheckin[];
}

export async function listRecentCheckinsForUsers(tenantId: string, userIds: string[], opts?: { sinceIso?: string }) {
  const since = opts?.sinceIso ?? null;
  let q = supabase
    .from("checkins")
    .select(
      "id,tenant_id,user_id,cadence,period_start,how_was_week,advances,difficulties,energy,motivation,needs_help,suggestions,created_at,updated_at",
    )
    .eq("tenant_id", tenantId)
    .in("user_id", userIds.length ? userIds : [NIL])
    .order("created_at", { ascending: false });

  if (since) q = q.gte("created_at", since);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as DbCheckin[];
}

// 1:1
export async function createOneOnOne(payload: {
  tenantId: string;
  employeeId: string;
  managerId: string;
  occurredAt: string; // date
  topics: string;
  feedbacks: string;
  decisions: string;
  actions: string;
  attentionPoints: string;
  nextSteps: string;
  createdByUserId?: string | null;
}) {
  const { data, error } = await supabase
    .from("one_on_one")
    .insert({
      tenant_id: payload.tenantId,
      employee_id: payload.employeeId,
      manager_id: payload.managerId,
      occurred_at: payload.occurredAt,
      topics: payload.topics.trim() || null,
      feedbacks: payload.feedbacks.trim() || null,
      decisions: payload.decisions.trim() || null,
      actions: payload.actions.trim() || null,
      attention_points: payload.attentionPoints.trim() || null,
      next_steps: payload.nextSteps.trim() || null,
      created_by_user_id: payload.createdByUserId ?? null,
    })
    .select(
      "id,tenant_id,employee_id,manager_id,occurred_at,topics,feedbacks,decisions,actions,attention_points,next_steps,created_by_user_id,created_at,updated_at",
    )
    .single();

  if (error) throw error;
  return data as DbOneOnOne;
}

export async function listOneOnOnesForUser(tenantId: string, userId: string, opts?: { limit?: number }) {
  const limit = Math.max(1, Math.min(200, opts?.limit ?? 20));

  const { data, error } = await supabase
    .from("one_on_one")
    .select(
      "id,tenant_id,employee_id,manager_id,occurred_at,topics,feedbacks,decisions,actions,attention_points,next_steps,created_by_user_id,created_at,updated_at",
    )
    .eq("tenant_id", tenantId)
    .or(`employee_id.eq.${userId},manager_id.eq.${userId}`)
    .order("occurred_at", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as DbOneOnOne[];
}

export async function listOneOnOnesForEmployees(tenantId: string, employeeIds: string[], opts?: { sinceIso?: string }) {
  let q = supabase
    .from("one_on_one")
    .select(
      "id,tenant_id,employee_id,manager_id,occurred_at,topics,feedbacks,decisions,actions,attention_points,next_steps,created_by_user_id,created_at,updated_at",
    )
    .eq("tenant_id", tenantId)
    .in("employee_id", employeeIds.length ? employeeIds : [NIL])
    .order("occurred_at", { ascending: false });

  if (opts?.sinceIso) q = q.gte("created_at", opts.sinceIso);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as DbOneOnOne[];
}

// Feedbacks
export async function createFeedback(payload: {
  tenantId: string;
  fromUserId: string;
  toUserId: string;
  kind: FeedbackKind;
  message: string;
}) {
  const { data, error } = await supabase
    .from("feedbacks")
    .insert({
      tenant_id: payload.tenantId,
      from_user_id: payload.fromUserId,
      to_user_id: payload.toUserId,
      kind: payload.kind,
      message: payload.message.trim(),
    })
    .select("id,tenant_id,from_user_id,to_user_id,kind,message,created_at")
    .single();

  if (error) throw error;
  return data as DbFeedback;
}

export async function listFeedbackForUser(tenantId: string, userId: string, opts?: { limit?: number }) {
  const { data, error } = await supabase
    .from("feedbacks")
    .select("id,tenant_id,from_user_id,to_user_id,kind,message,created_at")
    .eq("tenant_id", tenantId)
    .or(`from_user_id.eq.${userId},to_user_id.eq.${userId}`)
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(200, opts?.limit ?? 30)));

  if (error) throw error;
  return (data ?? []) as DbFeedback[];
}

// Career (manual)
export async function listCareerEvents(tenantId: string, userId: string, opts?: { limit?: number }) {
  const { data, error } = await supabase
    .from("career_progress")
    .select("id,tenant_id,user_id,event_type,title,description,occurred_at,meta,created_at,updated_at")
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false })
    .limit(Math.max(1, Math.min(200, opts?.limit ?? 30)));

  if (error) throw error;
  return (data ?? []) as DbCareerEvent[];
}

export async function createCareerEvent(payload: {
  tenantId: string;
  userId: string;
  eventType: string;
  title: string;
  description?: string;
  occurredAt?: string | null;
  meta?: any;
}) {
  const { data, error } = await supabase
    .from("career_progress")
    .insert({
      tenant_id: payload.tenantId,
      user_id: payload.userId,
      event_type: payload.eventType,
      title: payload.title.trim(),
      description: payload.description?.trim() || null,
      occurred_at: payload.occurredAt ?? null,
      meta: payload.meta ?? null,
    })
    .select("id,tenant_id,user_id,event_type,title,description,occurred_at,meta,created_at,updated_at")
    .single();

  if (error) throw error;
  return data as DbCareerEvent;
}
