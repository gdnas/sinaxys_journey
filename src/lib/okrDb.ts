import { supabase } from "@/integrations/supabase/client";

export type DbCompanyFundamentals = {
  company_id: string;
  mission: string | null;
  vision: string | null;
  purpose: string | null;
  values: string | null;
  culture: string | null;
  strategic_north: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export async function getCompanyFundamentals(companyId: string) {
  const { data, error } = await supabase
    .from("company_fundamentals")
    .select("company_id,mission,vision,purpose,values,culture,strategic_north,created_at,updated_at")
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as DbCompanyFundamentals | null;
}

export async function upsertCompanyFundamentals(companyId: string, patch: Partial<DbCompanyFundamentals>) {
  const payload = {
    company_id: companyId,
    mission: patch.mission ?? null,
    vision: patch.vision ?? null,
    purpose: patch.purpose ?? null,
    values: patch.values ?? null,
    culture: patch.culture ?? null,
    strategic_north: patch.strategic_north ?? null,
  };

  const { data, error } = await supabase
    .from("company_fundamentals")
    .upsert(payload, { onConflict: "company_id" })
    .select("company_id,mission,vision,purpose,values,culture,strategic_north,created_at,updated_at")
    .single();

  if (error) throw error;
  return data as DbCompanyFundamentals;
}

export type DbStrategyObjective = {
  id: string;
  company_id: string;
  horizon_years: 3 | 5 | 10;
  title: string;
  description: string | null;
  growth_levers: string | null;
  structuring_projects: string | null;
  bets_and_expansions: string | null;
  order_index: number;
  created_by_user_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export async function listStrategyObjectives(companyId: string) {
  const { data, error } = await supabase
    .from("strategy_objectives")
    .select(
      "id,company_id,horizon_years,title,description,growth_levers,structuring_projects,bets_and_expansions,order_index,created_by_user_id,created_at,updated_at",
    )
    .eq("company_id", companyId)
    .order("horizon_years", { ascending: true })
    .order("order_index", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbStrategyObjective[];
}

export async function createStrategyObjective(
  payload: Pick<DbStrategyObjective, "company_id" | "horizon_years" | "title"> &
    Partial<Pick<DbStrategyObjective, "description" | "growth_levers" | "structuring_projects" | "bets_and_expansions" | "order_index" | "created_by_user_id">>,
) {
  const { data, error } = await supabase
    .from("strategy_objectives")
    .insert({
      company_id: payload.company_id,
      horizon_years: payload.horizon_years,
      title: payload.title.trim(),
      description: payload.description ?? null,
      growth_levers: payload.growth_levers ?? null,
      structuring_projects: payload.structuring_projects ?? null,
      bets_and_expansions: payload.bets_and_expansions ?? null,
      order_index: payload.order_index ?? 0,
      created_by_user_id: payload.created_by_user_id ?? null,
    })
    .select(
      "id,company_id,horizon_years,title,description,growth_levers,structuring_projects,bets_and_expansions,order_index,created_by_user_id,created_at,updated_at",
    )
    .single();
  if (error) throw error;
  return data as DbStrategyObjective;
}

export type CycleType = "ANNUAL" | "QUARTERLY";
export type CycleStatus = "PLANNING" | "ACTIVE" | "CLOSED";

export type DbOkrCycle = {
  id: string;
  company_id: string;
  type: CycleType;
  year: number;
  quarter: number | null;
  start_date: string | null;
  end_date: string | null;
  status: CycleStatus;
  name: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export async function listOkrCycles(companyId: string) {
  const { data, error } = await supabase
    .from("okr_cycles")
    .select("id,company_id,type,year,quarter,start_date,end_date,status,name,created_at,updated_at")
    .eq("company_id", companyId)
    .order("year", { ascending: false })
    .order("quarter", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DbOkrCycle[];
}

export async function createOkrCycle(companyId: string, payload: Omit<DbOkrCycle, "id" | "company_id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("okr_cycles")
    .insert({
      company_id: companyId,
      type: payload.type,
      year: payload.year,
      quarter: payload.quarter ?? null,
      start_date: payload.start_date ?? null,
      end_date: payload.end_date ?? null,
      status: payload.status,
      name: payload.name ?? null,
    })
    .select("id,company_id,type,year,quarter,start_date,end_date,status,name,created_at,updated_at")
    .single();
  if (error) throw error;
  return data as DbOkrCycle;
}

export type ObjectiveLevel = "COMPANY" | "DEPARTMENT" | "TEAM" | "INDIVIDUAL";

export type DbOkrObjective = {
  id: string;
  company_id: string;
  cycle_id: string;
  parent_objective_id: string | null;
  level: ObjectiveLevel;
  department_id: string | null;
  owner_user_id: string;
  title: string;
  description: string | null;
  strategic_reason: string | null;
  linked_fundamental: "MISSION" | "VISION" | "PURPOSE" | "VALUES" | "CULTURE" | "NORTH" | null;
  linked_fundamental_text: string | null;
  due_at: string | null;
  // Business case (optional)
  estimated_value_brl: number | null;
  estimated_effort_hours: number | null;
  estimated_cost_brl: number | null;
  estimated_roi_pct: number | null;
  created_at: string | null;
  updated_at: string | null;
};

const objectiveSelect =
  "id,company_id,cycle_id,parent_objective_id,level,department_id,owner_user_id,title,description,strategic_reason,linked_fundamental,linked_fundamental_text,due_at,estimated_value_brl,estimated_effort_hours,estimated_cost_brl,estimated_roi_pct,created_at,updated_at";

export async function listOkrObjectives(companyId: string, cycleId: string) {
  const { data, error } = await supabase
    .from("okr_objectives")
    .select(objectiveSelect)
    .eq("company_id", companyId)
    .eq("cycle_id", cycleId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DbOkrObjective[];
}

export async function getOkrObjective(objectiveId: string) {
  const { data, error } = await supabase.from("okr_objectives").select(objectiveSelect).eq("id", objectiveId).maybeSingle();

  if (error) throw error;
  return (data ?? null) as DbOkrObjective | null;
}

export async function createOkrObjective(payload: Omit<DbOkrObjective, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("okr_objectives")
    .insert({
      company_id: payload.company_id,
      cycle_id: payload.cycle_id,
      parent_objective_id: payload.parent_objective_id ?? null,
      level: payload.level,
      department_id: payload.department_id ?? null,
      owner_user_id: payload.owner_user_id,
      title: payload.title.trim(),
      description: payload.description ?? null,
      strategic_reason: payload.strategic_reason ?? null,
      linked_fundamental: payload.linked_fundamental ?? null,
      linked_fundamental_text: payload.linked_fundamental_text ?? null,
      due_at: payload.due_at ?? null,
      estimated_value_brl: payload.estimated_value_brl ?? null,
      estimated_effort_hours: payload.estimated_effort_hours ?? null,
      estimated_cost_brl: payload.estimated_cost_brl ?? null,
      estimated_roi_pct: payload.estimated_roi_pct ?? null,
    })
    .select(objectiveSelect)
    .single();

  if (error) throw error;
  return data as DbOkrObjective;
}

export type KrConfidence = "ON_TRACK" | "AT_RISK" | "OFF_TRACK";

export type DbOkrKeyResult = {
  id: string;
  objective_id: string;
  title: string;
  metric_unit: string | null;
  start_value: number | null;
  target_value: number | null;
  current_value: number | null;
  owner_user_id: string | null;
  confidence: KrConfidence;
  created_at: string | null;
  updated_at: string | null;
};

export async function listKeyResults(objectiveId: string) {
  const { data, error } = await supabase
    .from("okr_key_results")
    .select("id,objective_id,title,metric_unit,start_value,target_value,current_value,owner_user_id,confidence,created_at,updated_at")
    .eq("objective_id", objectiveId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbOkrKeyResult[];
}

export async function createKeyResult(payload: Omit<DbOkrKeyResult, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("okr_key_results")
    .insert({
      objective_id: payload.objective_id,
      title: payload.title.trim(),
      metric_unit: payload.metric_unit ?? null,
      start_value: payload.start_value ?? null,
      target_value: payload.target_value ?? null,
      current_value: payload.current_value ?? null,
      owner_user_id: payload.owner_user_id ?? null,
      confidence: payload.confidence,
    })
    .select("id,objective_id,title,metric_unit,start_value,target_value,current_value,owner_user_id,confidence,created_at,updated_at")
    .single();
  if (error) throw error;
  return data as DbOkrKeyResult;
}

export type DeliverableTier = "TIER1" | "TIER2";
export type WorkStatus = "TODO" | "IN_PROGRESS" | "DONE";

export type DbDeliverable = {
  id: string;
  key_result_id: string;
  tier: DeliverableTier;
  title: string;
  description: string | null;
  owner_user_id: string | null;
  status: WorkStatus;
  due_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export async function listDeliverables(keyResultId: string) {
  const { data, error } = await supabase
    .from("okr_deliverables")
    .select("id,key_result_id,tier,title,description,owner_user_id,status,due_at,created_at,updated_at")
    .eq("key_result_id", keyResultId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbDeliverable[];
}

export async function listDeliverablesByKeyResultIds(keyResultIds: string[]) {
  if (!keyResultIds.length) return [] as DbDeliverable[];
  const { data, error } = await supabase
    .from("okr_deliverables")
    .select("id,key_result_id,tier,title,description,owner_user_id,status,due_at,created_at,updated_at")
    .in("key_result_id", keyResultIds)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbDeliverable[];
}

export async function createDeliverable(payload: Omit<DbDeliverable, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("okr_deliverables")
    .insert({
      key_result_id: payload.key_result_id,
      tier: payload.tier,
      title: payload.title.trim(),
      description: payload.description ?? null,
      owner_user_id: payload.owner_user_id ?? null,
      status: payload.status,
      due_at: payload.due_at ?? null,
    })
    .select("id,key_result_id,tier,title,description,owner_user_id,status,due_at,created_at,updated_at")
    .single();
  if (error) throw error;
  return data as DbDeliverable;
}

export type DbTask = {
  id: string;
  deliverable_id: string;
  title: string;
  description: string | null;
  owner_user_id: string;
  status: WorkStatus;
  due_date: string | null;
  estimate_minutes: number | null;
  checklist: any;
  // Business case (optional)
  estimated_value_brl: number | null;
  estimated_cost_brl: number | null;
  estimated_roi_pct: number | null;
  created_at: string | null;
  updated_at: string | null;
};

const taskSelect =
  "id,deliverable_id,title,description,owner_user_id,status,due_date,estimate_minutes,checklist,estimated_value_brl,estimated_cost_brl,estimated_roi_pct,created_at,updated_at";

export async function listTasksByDeliverableIds(deliverableIds: string[]) {
  if (!deliverableIds.length) return [] as DbTask[];
  const { data, error } = await supabase
    .from("okr_tasks")
    .select(taskSelect)
    .in("deliverable_id", deliverableIds)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as DbTask[];
}

export async function listTasksForUser(companyId: string, userId: string, opts?: { from?: string; to?: string }) {
  // We filter by owner on okr_tasks, and by date range (optional).
  let q = supabase
    .from("okr_tasks")
    .select(taskSelect)
    .eq("owner_user_id", userId)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  // Keep companyId in the queryKey; RLS ensures we only see tasks from our company.
  void companyId;

  if (opts?.from) q = q.gte("due_date", opts.from);
  if (opts?.to) q = q.lte("due_date", opts.to);

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as DbTask[];
}

export async function updateTask(
  taskId: string,
  patch: Partial<
    Pick<
      DbTask,
      "status" | "title" | "description" | "due_date" | "estimate_minutes" | "checklist" | "estimated_value_brl" | "estimated_cost_brl" | "estimated_roi_pct"
    >
  >,
) {
  const { data, error } = await supabase
    .from("okr_tasks")
    .update({
      status: patch.status,
      title: patch.title,
      description: patch.description,
      due_date: patch.due_date,
      estimate_minutes: patch.estimate_minutes,
      checklist: patch.checklist,
      estimated_value_brl: patch.estimated_value_brl,
      estimated_cost_brl: patch.estimated_cost_brl,
      estimated_roi_pct: patch.estimated_roi_pct,
    })
    .eq("id", taskId)
    .select(taskSelect)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as DbTask | null;
}

export async function createTask(payload: Omit<DbTask, "id" | "created_at" | "updated_at">) {
  const { data, error } = await supabase
    .from("okr_tasks")
    .insert({
      deliverable_id: payload.deliverable_id,
      title: payload.title.trim(),
      description: payload.description ?? null,
      owner_user_id: payload.owner_user_id,
      status: payload.status,
      due_date: payload.due_date ?? null,
      estimate_minutes: payload.estimate_minutes ?? null,
      checklist: payload.checklist ?? null,
      estimated_value_brl: payload.estimated_value_brl ?? null,
      estimated_cost_brl: payload.estimated_cost_brl ?? null,
      estimated_roi_pct: payload.estimated_roi_pct ?? null,
    })
    .select(taskSelect)
    .single();

  if (error) throw error;
  return data as DbTask;
}

export function krProgressPct(kr: Pick<DbOkrKeyResult, "start_value" | "current_value" | "target_value">) {
  const start = typeof kr.start_value === "number" ? kr.start_value : null;
  const cur = typeof kr.current_value === "number" ? kr.current_value : null;
  const target = typeof kr.target_value === "number" ? kr.target_value : null;

  if (start === null || cur === null || target === null) return null;
  if (target === start) return 100;
  const pct = ((cur - start) / (target - start)) * 100;
  const clamped = Math.max(0, Math.min(100, pct));
  return Math.round(clamped);
}