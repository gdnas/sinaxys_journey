import { supabase } from "@/integrations/supabase/client";

export type DbCompanyFundamentals = {
  company_id: string;
  mission: string | null;
  vision: string | null;
  purpose: string | null;
  values: string | null;
  culture: string | null;
  strategic_north: string | null;
  annual_drivers: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export async function getCompanyFundamentals(companyId: string) {
  const { data, error } = await supabase
    .from("company_fundamentals")
    .select("company_id,mission,vision,purpose,values,culture,strategic_north,annual_drivers,created_at,updated_at")
    .eq("company_id", companyId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as DbCompanyFundamentals | null;
}

export async function upsertCompanyFundamentals(companyId: string, patch: Partial<DbCompanyFundamentals>) {
  // IMPORTANT: Only send fields that are present in `patch`.
  // Otherwise, we would overwrite other columns with NULL when doing a partial update.
  const payload: Record<string, any> = { company_id: companyId };
  const keys: Array<
    keyof Pick<DbCompanyFundamentals, "mission" | "vision" | "purpose" | "values" | "culture" | "strategic_north" | "annual_drivers">
  > = ["mission", "vision", "purpose", "values", "culture", "strategic_north", "annual_drivers"];

  for (const k of keys) {
    if (Object.prototype.hasOwnProperty.call(patch, k)) {
      payload[k] = (patch as any)[k] ?? null;
    }
  }

  const { data, error } = await supabase
    .from("company_fundamentals")
    .upsert(payload, { onConflict: "company_id" })
    .select("company_id,mission,vision,purpose,values,culture,strategic_north,annual_drivers,created_at,updated_at")
    .single();

  if (error) throw error;
  return data as DbCompanyFundamentals;
}

export type DbStrategyObjective = {
  id: string;
  company_id: string;
  horizon_years: 2 | 5 | 10;
  target_year: number | null;
  title: string;
  description: string | null;
  growth_levers: string | null;
  structuring_projects: string | null;
  bets_and_expansions: string | null;
  order_index: number;
  created_by_user_id: string | null;
  owner_user_id: string | null;
  parent_strategy_objective_id: string | null;
  linked_fundamental: "VISION" | "PURPOSE" | "MISSION" | "VALUES" | "CULTURE" | null;
  created_at: string | null;
  updated_at: string | null;
};

export async function listStrategyObjectives(companyId: string) {
  const { data, error } = await supabase
    .from("strategy_objectives")
    .select(
      "id,company_id,horizon_years,target_year,title,description,growth_levers,structuring_projects,bets_and_expansions,order_index,created_by_user_id,owner_user_id,parent_strategy_objective_id,linked_fundamental,created_at,updated_at",
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
    Partial<
      Pick<
        DbStrategyObjective,
        | "target_year"
        | "description"
        | "growth_levers"
        | "structuring_projects"
        | "bets_and_expansions"
        | "order_index"
        | "created_by_user_id"
        | "owner_user_id"
        | "parent_strategy_objective_id"
        | "linked_fundamental"
      >
    >,
) {
  const { data, error } = await supabase
    .from("strategy_objectives")
    .insert({
      company_id: payload.company_id,
      horizon_years: payload.horizon_years,
      target_year: payload.target_year ?? null,
      title: payload.title.trim(),
      description: payload.description ?? null,
      growth_levers: payload.growth_levers ?? null,
      structuring_projects: payload.structuring_projects ?? null,
      bets_and_expansions: payload.bets_and_expansions ?? null,
      order_index: payload.order_index ?? 0,
      created_by_user_id: payload.created_by_user_id ?? null,
      owner_user_id: payload.owner_user_id ?? null,
      parent_strategy_objective_id: payload.parent_strategy_objective_id ?? null,
      linked_fundamental: payload.linked_fundamental ?? null,
    })
    .select(
      "id,company_id,horizon_years,target_year,title,description,growth_levers,structuring_projects,bets_and_expansions,order_index,created_by_user_id,owner_user_id,parent_strategy_objective_id,linked_fundamental,created_at,updated_at",
    )
    .single();
  if (error) throw error;
  return data as DbStrategyObjective;
}

export async function updateStrategyObjective(
  id: string,
  patch: Partial<
    Pick<
      DbStrategyObjective,
      | "title"
      | "target_year"
      | "description"
      | "growth_levers"
      | "structuring_projects"
      | "bets_and_expansions"
      | "order_index"
      | "horizon_years"
      | "owner_user_id"
      | "parent_strategy_objective_id"
      | "linked_fundamental"
    >
  >,
) {
  const update: Record<string, any> = {};
  if ("title" in patch) update.title = patch.title?.trim();
  if ("target_year" in patch) update.target_year = patch.target_year ?? null;
  if ("description" in patch) update.description = patch.description ?? null;
  if ("growth_levers" in patch) update.growth_levers = patch.growth_levers ?? null;
  if ("structuring_projects" in patch) update.structuring_projects = patch.structuring_projects ?? null;
  if ("bets_and_expansions" in patch) update.bets_and_expansions = patch.bets_and_expansions ?? null;
  if ("order_index" in patch) update.order_index = patch.order_index ?? 0;
  if ("horizon_years" in patch) update.horizon_years = patch.horizon_years;
  if ("owner_user_id" in patch) update.owner_user_id = patch.owner_user_id ?? null;
  if ("parent_strategy_objective_id" in patch) update.parent_strategy_objective_id = patch.parent_strategy_objective_id ?? null;
  if ("linked_fundamental" in patch) update.linked_fundamental = patch.linked_fundamental ?? null;

  const { data, error } = await supabase
    .from("strategy_objectives")
    .update(update)
    .eq("id", id)
    .select(
      "id,company_id,horizon_years,target_year,title,description,growth_levers,structuring_projects,bets_and_expansions,order_index,created_by_user_id,owner_user_id,parent_strategy_objective_id,linked_fundamental,created_at,updated_at",
    )
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as DbStrategyObjective | null;
}

export async function deleteStrategyObjective(id: string) {
  const { error } = await supabase.from("strategy_objectives").delete().eq("id", id);
  if (error) throw error;
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

export async function ensureOkrCycle(
  payload: Pick<DbOkrCycle, "type" | "year"> & Partial<Pick<DbOkrCycle, "quarter" | "status" | "name">>,
) {
  const { data, error } = await supabase.functions.invoke("okr-ensure-cycle", {
    body: {
      type: payload.type,
      year: payload.year,
      quarter: payload.quarter ?? null,
      status: payload.status ?? "ACTIVE",
      name: payload.name ?? null,
    },
  });

  if (error) throw error;
  if (!data?.ok || !data?.cycle?.id) throw new Error(data?.message ?? "Não foi possível garantir o ciclo.");
  return data.cycle as DbOkrCycle;
}

export type ObjectiveLevel = "COMPANY" | "DEPARTMENT" | "TEAM" | "INDIVIDUAL";
export type ObjectiveStatus = "ACTIVE" | "ACHIEVED";

export type DbOkrObjective = {
  id: string;
  company_id: string;
  cycle_id: string;
  parent_objective_id: string | null;
  strategy_objective_id: string | null;
  level: ObjectiveLevel;
  department_id: string | null;
  owner_user_id: string;
  title: string;
  description: string | null;
  strategic_reason: string | null;
  linked_fundamental: "MISSION" | "VISION" | "PURPOSE" | "VALUES" | "CULTURE" | "NORTH" | "DRIVERS" | null;
  linked_fundamental_text: string | null;
  due_at: string | null;
  // Business case (optional)
  estimated_value_brl: number | null;
  estimated_effort_hours: number | null;
  estimated_cost_brl: number | null;
  estimated_roi_pct: number | null;
  expected_profit_brl: number | null;
  profit_thesis: string | null;
  expected_revenue_at: string | null;
  // Attainment
  expected_attainment_pct: number | null;
  status: ObjectiveStatus;
  achieved_pct: number | null;
  achieved_at: string | null;
  // Performance assessment (by head)
  head_performance_score: number | null;
  head_performance_notes: string | null;
  head_performance_reviewed_at: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const objectiveSelect =
  "id,company_id,cycle_id,parent_objective_id,strategy_objective_id,level,department_id,owner_user_id,title,description,strategic_reason,linked_fundamental,linked_fundamental_text,due_at,estimated_value_brl,estimated_effort_hours,estimated_cost_brl,estimated_roi_pct,expected_profit_brl,profit_thesis,expected_revenue_at,expected_attainment_pct,status,achieved_pct,achieved_at,head_performance_score,head_performance_notes,head_performance_reviewed_at,created_at,updated_at";

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

export async function listOkrObjectivesForOwner(companyId: string, ownerUserId: string) {
  const { data, error } = await supabase
    .from("okr_objectives")
    .select(objectiveSelect)
    .eq("company_id", companyId)
    .eq("owner_user_id", ownerUserId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DbOkrObjective[];
}

export async function listOkrObjectivesByIds(objectiveIds: string[]) {
  if (!objectiveIds.length) return [] as DbOkrObjective[];

  const { data, error } = await supabase
    .from("okr_objectives")
    .select(objectiveSelect)
    .in("id", objectiveIds)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DbOkrObjective[];
}

export async function getOkrObjective(objectiveId: string) {
  const { data, error } = await supabase.from("okr_objectives").select(objectiveSelect).eq("id", objectiveId).maybeSingle();

  if (error) throw error;
  return (data ?? null) as DbOkrObjective | null;
}

export async function createOkrObjective(
  payload: Omit<
    DbOkrObjective,
    | "id"
    | "created_at"
    | "updated_at"
    | "status"
    | "achieved_pct"
    | "achieved_at"
    | "head_performance_score"
    | "head_performance_notes"
    | "head_performance_reviewed_at"
  >,
) {
  const { data, error } = await supabase
    .from("okr_objectives")
    .insert({
      company_id: payload.company_id,
      cycle_id: payload.cycle_id,
      parent_objective_id: payload.parent_objective_id ?? null,
      strategy_objective_id: payload.strategy_objective_id ?? null,
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
      expected_profit_brl: payload.expected_profit_brl ?? null,
      profit_thesis: payload.profit_thesis ?? null,
      expected_revenue_at: payload.expected_revenue_at ?? null,
      expected_attainment_pct: payload.expected_attainment_pct ?? null,
    })
    .select(objectiveSelect)
    .single();

  if (error) throw error;
  return data as DbOkrObjective;
}

export async function updateOkrObjective(
  objectiveId: string,
  patch: Partial<
    Pick<
      DbOkrObjective,
      | "title"
      | "description"
      | "strategic_reason"
      | "linked_fundamental"
      | "linked_fundamental_text"
      | "owner_user_id"
      | "department_id"
      | "parent_objective_id"
      | "strategy_objective_id"
      | "expected_attainment_pct"
      | "estimated_value_brl"
      | "estimated_effort_hours"
      | "estimated_cost_brl"
      | "estimated_roi_pct"
      | "expected_profit_brl"
      | "profit_thesis"
      | "expected_revenue_at"
      | "status"
      | "achieved_pct"
      | "achieved_at"
      | "due_at"
      | "level"
      | "head_performance_score"
      | "head_performance_notes"
      | "head_performance_reviewed_at"
    >
  >,
) {
  const update: Record<string, any> = {};

  if ("title" in patch) update.title = patch.title?.trim();
  if ("description" in patch) update.description = patch.description ?? null;
  if ("strategic_reason" in patch) update.strategic_reason = patch.strategic_reason ?? null;

  if ("linked_fundamental" in patch) update.linked_fundamental = patch.linked_fundamental ?? null;
  if ("linked_fundamental_text" in patch) update.linked_fundamental_text = patch.linked_fundamental_text ?? null;

  if ("owner_user_id" in patch) update.owner_user_id = patch.owner_user_id;
  if ("department_id" in patch) update.department_id = patch.department_id ?? null;
  if ("parent_objective_id" in patch) update.parent_objective_id = patch.parent_objective_id ?? null;
  if ("strategy_objective_id" in patch) update.strategy_objective_id = patch.strategy_objective_id ?? null;
  if ("level" in patch) update.level = patch.level;

  if ("expected_attainment_pct" in patch) update.expected_attainment_pct = patch.expected_attainment_pct ?? null;
  if ("estimated_value_brl" in patch) update.estimated_value_brl = patch.estimated_value_brl ?? null;
  if ("estimated_effort_hours" in patch) update.estimated_effort_hours = patch.estimated_effort_hours ?? null;
  if ("estimated_cost_brl" in patch) update.estimated_cost_brl = patch.estimated_cost_brl ?? null;
  if ("estimated_roi_pct" in patch) update.estimated_roi_pct = patch.estimated_roi_pct ?? null;
  if ("expected_profit_brl" in patch) update.expected_profit_brl = patch.expected_profit_brl ?? null;
  if ("profit_thesis" in patch) update.profit_thesis = patch.profit_thesis ?? null;
  if ("expected_revenue_at" in patch) update.expected_revenue_at = patch.expected_revenue_at ?? null;

  if ("status" in patch) update.status = patch.status;
  if ("achieved_pct" in patch) update.achieved_pct = patch.achieved_pct ?? null;
  if ("achieved_at" in patch) update.achieved_at = patch.achieved_at ?? null;
  if ("due_at" in patch) update.due_at = patch.due_at ?? null;
  if ("head_performance_score" in patch) update.head_performance_score = patch.head_performance_score ?? null;
  if ("head_performance_notes" in patch) update.head_performance_notes = patch.head_performance_notes ?? null;
  if ("head_performance_reviewed_at" in patch) update.head_performance_reviewed_at = patch.head_performance_reviewed_at ?? null;

  const { data, error } = await supabase.from("okr_objectives").update(update).eq("id", objectiveId).select(objectiveSelect).maybeSingle();

  if (error) throw error;
  return (data ?? null) as DbOkrObjective | null;
}

export async function deleteKeyResult(keyResultId: string) {
  const { error } = await supabase.from("okr_key_results").delete().eq("id", keyResultId);
  if (error) throw error;
}

export async function deleteDeliverable(deliverableId: string) {
  const { error } = await supabase.from("okr_deliverables").delete().eq("id", deliverableId);
  if (error) throw error;
}

export async function deleteTask(taskId: string) {
  const { error } = await supabase.from("okr_tasks").delete().eq("id", taskId);
  if (error) throw error;
}

export async function deleteOkrObjective(objectiveId: string) {
  const { error } = await supabase.from("okr_objectives").delete().eq("id", objectiveId);
  if (error) throw error;
}

export async function deleteKeyResultCascade(keyResultId: string) {
  // Client-side cascade delete to avoid FK constraint issues.
  const deliverables = await listDeliverablesByKeyResultIds([keyResultId]);
  const deliverableIds = deliverables.map((d) => d.id);
  const tasks = deliverableIds.length ? await listTasksByDeliverableIds(deliverableIds) : [];

  // Remove alignment links + change logs tied to this KR (if any)
  await supabase.from("okr_kr_objective_links").delete().eq("key_result_id", keyResultId);
  await supabase.from("okr_key_result_change_logs").delete().eq("key_result_id", keyResultId);

  // Delete bottom-up
  await Promise.all(tasks.map((t) => deleteTask(t.id)));
  await Promise.all(deliverables.map((d) => deleteDeliverable(d.id)));
  await deleteKeyResult(keyResultId);
}

export async function deleteOkrObjectiveCascade(objectiveId: string) {
  // Client-side cascade delete to avoid FK constraint issues.
  const krs = await listKeyResults(objectiveId);
  const krIds = krs.map((k) => k.id);

  // Remove alignment links (objective side + KR side) and change logs
  await supabase.from("okr_kr_objective_links").delete().eq("objective_id", objectiveId);
  if (krIds.length) {
    await supabase.from("okr_kr_objective_links").delete().in("key_result_id", krIds);
    await supabase.from("okr_key_result_change_logs").delete().in("key_result_id", krIds);
  }

  const deliverables = krIds.length ? await listDeliverablesByKeyResultIds(krIds) : [];
  const deliverableIds = deliverables.map((d) => d.id);

  const tasks = deliverableIds.length ? await listTasksByDeliverableIds(deliverableIds) : [];

  // Delete bottom-up
  await Promise.all(tasks.map((t) => deleteTask(t.id)));
  await Promise.all(deliverables.map((d) => deleteDeliverable(d.id)));
  await Promise.all(krs.map((k) => deleteKeyResult(k.id)));
  await deleteOkrObjective(objectiveId);
}

export async function listKeyResultsByObjectiveIds(objectiveIds: string[]) {
  if (!objectiveIds.length) return [] as DbOkrKeyResult[];
  const { data, error } = await supabase
    .from("okr_key_results")
    .select(krSelect)
    .in("objective_id", objectiveIds)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbOkrKeyResult[];
}

export async function listKeyResultsByIds(keyResultIds: string[]) {
  if (!keyResultIds.length) return [] as DbOkrKeyResult[];
  const { data, error } = await supabase
    .from("okr_key_results")
    .select(krSelect)
    .in("id", keyResultIds)
    .order("created_at", { ascending: true });

  if (error) throw error;
  return (data ?? []) as DbOkrKeyResult[];
}

export type KrConfidence = "ON_TRACK" | "AT_RISK" | "OFF_TRACK";
export type KrKind = "METRIC" | "DELIVERABLE";

export type DbOkrKeyResult = {
  id: string;
  objective_id: string;
  title: string;
  kind: KrKind;
  due_at: string | null;
  achieved: boolean;
  achieved_at: string | null;
  metric_unit: string | null;
  start_value: number | null;
  target_value: number | null;
  current_value: number | null;
  owner_user_id: string | null;
  confidence: KrConfidence;
  created_at: string | null;
  updated_at: string | null;
};

export type DbKrChangeLog = {
  id: string;
  company_id: string;
  key_result_id: string;
  user_id: string;
  changes: any;
  created_at: string;
};

export async function listKrChangeLogs(keyResultId: string) {
  const { data, error } = await supabase
    .from("okr_key_result_change_logs")
    .select("id,company_id,key_result_id,user_id,changes,created_at")
    .eq("key_result_id", keyResultId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as DbKrChangeLog[];
}

export async function createKrChangeLog(payload: Pick<DbKrChangeLog, "company_id" | "key_result_id" | "user_id" | "changes">) {
  const { data, error } = await supabase
    .from("okr_key_result_change_logs")
    .insert({
      company_id: payload.company_id,
      key_result_id: payload.key_result_id,
      user_id: payload.user_id,
      changes: payload.changes ?? {},
    })
    .select("id,company_id,key_result_id,user_id,changes,created_at")
    .single();
  if (error) throw error;
  return data as DbKrChangeLog;
}

const krSelect =
  "id,objective_id,title,kind,due_at,achieved,achieved_at,metric_unit,start_value,target_value,current_value,owner_user_id,confidence,created_at,updated_at";

export async function listKeyResults(objectiveId: string) {
  const { data, error } = await supabase
    .from("okr_key_results")
    .select(krSelect)
    .eq("objective_id", objectiveId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbOkrKeyResult[];
}

export async function createKeyResult(payload: Omit<DbOkrKeyResult, "id" | "created_at" | "updated_at" | "achieved_at">) {
  const { data, error } = await supabase
    .from("okr_key_results")
    .insert({
      objective_id: payload.objective_id,
      title: payload.title.trim(),
      kind: payload.kind,
      due_at: payload.due_at ?? null,
      achieved: payload.achieved,
      metric_unit: payload.metric_unit ?? null,
      start_value: payload.start_value ?? null,
      target_value: payload.target_value ?? null,
      current_value: payload.current_value ?? null,
      owner_user_id: payload.owner_user_id ?? null,
      confidence: payload.confidence,
    })
    .select(krSelect)
    .single();
  if (error) throw error;
  return data as DbOkrKeyResult;
}

export async function updateKeyResult(
  keyResultId: string,
  patch: Partial<Pick<DbOkrKeyResult, "title" | "metric_unit" | "start_value" | "target_value" | "current_value" | "confidence" | "owner_user_id" | "achieved" | "achieved_at" | "due_at" | "kind">>,
) {
  const { data, error } = await supabase
    .from("okr_key_results")
    .update({
      title: patch.title,
      metric_unit: patch.metric_unit,
      start_value: patch.start_value,
      target_value: patch.target_value,
      current_value: patch.current_value,
      confidence: patch.confidence,
      owner_user_id: patch.owner_user_id,
      achieved: patch.achieved,
      achieved_at: patch.achieved_at,
      due_at: patch.due_at,
      kind: patch.kind,
    })
    .eq("id", keyResultId)
    .select(krSelect)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as DbOkrKeyResult | null;
}

export async function updateDeliverable(
  deliverableId: string,
  patch: Partial<Pick<DbDeliverable, "title" | "description" | "owner_user_id" | "status" | "due_at" | "tier">>,
) {
  const { data, error } = await supabase
    .from("okr_deliverables")
    .update({
      title: patch.title?.trim(),
      description: patch.description ?? null,
      owner_user_id: patch.owner_user_id ?? null,
      status: patch.status,
      due_at: patch.due_at ?? null,
      tier: patch.tier,
    })
    .eq("id", deliverableId)
    .select("id,key_result_id,tier,title,description,owner_user_id,status,due_at,created_at,updated_at")
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as DbDeliverable | null;
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
  completed_at: string | null;
  // Business case (optional)
  estimated_value_brl: number | null;
  estimated_cost_brl: number | null;
  estimated_roi_pct: number | null;
  created_at: string | null;
  updated_at: string | null;
};

const taskSelect =
  "id,deliverable_id,title,description,owner_user_id,status,due_date,estimate_minutes,checklist,completed_at,estimated_value_brl,estimated_cost_brl,estimated_roi_pct,created_at,updated_at";

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
      | "status"
      | "title"
      | "description"
      | "owner_user_id"
      | "due_date"
      | "estimate_minutes"
      | "checklist"
      | "estimated_value_brl"
      | "estimated_cost_brl"
      | "estimated_roi_pct"
    >
  >,
) {
  const { data, error } = await supabase
    .from("okr_tasks")
    .update({
      status: patch.status,
      title: patch.title,
      description: patch.description,
      owner_user_id: patch.owner_user_id,
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

export async function createTask(payload: Omit<DbTask, "id" | "created_at" | "updated_at" | "completed_at">) {
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

export function krProgressPct(kr: Pick<DbOkrKeyResult, "kind" | "start_value" | "current_value" | "target_value" | "achieved">) {
  if (kr.kind === "DELIVERABLE") return kr.achieved ? 100 : 0;

  const start = typeof kr.start_value === "number" ? kr.start_value : null;
  const cur = typeof kr.current_value === "number" ? kr.current_value : null;
  const target = typeof kr.target_value === "number" ? kr.target_value : null;

  if (start === null || cur === null || target === null) return null;
  if (target === start) return 100;
  const pct = ((cur - start) / (target - start)) * 100;
  const clamped = Math.max(0, Math.min(100, pct));
  return Math.round(clamped);
}

export type DbTaskWithContext = DbTask & {
  objective_id: string;
  objective_title: string;
  objective_level: ObjectiveLevel;
  department_id: string | null;
};

export type DbTaskWithContextV2 = DbTaskWithContext & {
  deliverable_title: string;
  key_result_id: string;
  key_result_title: string;
  key_result_kind: KrKind;
  cycle_id: string;
  cycle_type: CycleType;
  cycle_year: number;
  cycle_quarter: number | null;
};

export async function listTasksForCompany(companyId: string, opts?: { from?: string; to?: string }) {
  const { data, error } = await supabase.rpc("okr_tasks_for_company", {
    p_company_id: companyId,
    p_from: opts?.from ?? null,
    p_to: opts?.to ?? null,
  });
  if (error) throw error;
  return (data ?? []) as unknown as DbTaskWithContext[];
}

export async function listTasksForDepartment(companyId: string, departmentId: string, opts?: { from?: string; to?: string }) {
  const { data, error } = await supabase.rpc("okr_tasks_for_department", {
    p_company_id: companyId,
    p_department_id: departmentId,
    p_from: opts?.from ?? null,
    p_to: opts?.to ?? null,
  });
  if (error) throw error;
  return (data ?? []) as unknown as DbTaskWithContext[];
}

export async function listTasksForUserWithContext(userId: string, opts?: { from?: string; to?: string }) {
  const { data, error } = await supabase.rpc("okr_tasks_for_user", {
    p_user_id: userId,
    p_from: opts?.from ?? null,
    p_to: opts?.to ?? null,
  });
  if (error) throw error;
  return (data ?? []) as unknown as DbTaskWithContext[];
}

export async function listTasksForUserWithContextV2(userId: string, opts?: { from?: string; to?: string }) {
  const { data, error } = await supabase.rpc("okr_tasks_for_user_v2", {
    p_user_id: userId,
    p_from: opts?.from ?? null,
    p_to: opts?.to ?? null,
  });
  if (error) throw error;
  return (data ?? []) as unknown as DbTaskWithContextV2[];
}

// --- Long-term KRs (Strategy) ---

export type StrategyKrKind = "METRIC" | "DELIVERABLE";

export type DbStrategyKeyResult = {
  id: string;
  objective_id: string;
  title: string;
  kind: StrategyKrKind;
  metric_unit: string | null;
  start_value: number | null;
  target_value: number | null;
  current_value: number | null;
  due_at: string | null;
  achieved: boolean;
  achieved_at: string | null;
  owner_user_id: string | null;
  confidence: "ON_TRACK" | "AT_RISK" | "OFF_TRACK";
  created_at: string | null;
  updated_at: string | null;
};

const strategyKrSelect =
  "id,objective_id,title,kind,metric_unit,start_value,target_value,current_value,due_at,achieved,achieved_at,owner_user_id,confidence,created_at,updated_at";

export async function listStrategyKeyResults(objectiveId: string) {
  const { data, error } = await supabase
    .from("strategy_key_results")
    .select(strategyKrSelect)
    .eq("objective_id", objectiveId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as DbStrategyKeyResult[];
}

export async function createStrategyKeyResult(
  payload: Omit<DbStrategyKeyResult, "id" | "created_at" | "updated_at" | "achieved_at">,
) {
  const { data, error } = await supabase
    .from("strategy_key_results")
    .insert({
      objective_id: payload.objective_id,
      title: payload.title.trim(),
      kind: payload.kind,
      metric_unit: payload.metric_unit ?? null,
      start_value: payload.start_value ?? null,
      target_value: payload.target_value ?? null,
      current_value: payload.current_value ?? null,
      due_at: payload.due_at ?? null,
      achieved: payload.achieved ?? false,
      owner_user_id: payload.owner_user_id ?? null,
      confidence: payload.confidence,
    })
    .select(strategyKrSelect)
    .single();
  if (error) throw error;
  return data as DbStrategyKeyResult;
}

export async function updateStrategyKeyResult(
  id: string,
  patch: Partial<Pick<DbStrategyKeyResult, "title" | "metric_unit" | "start_value" | "target_value" | "current_value" | "due_at" | "achieved" | "achieved_at" | "owner_user_id" | "confidence" | "kind">>,
) {
  const update: Record<string, any> = {};
  if ("title" in patch) update.title = patch.title?.trim();
  if ("kind" in patch) update.kind = patch.kind;
  if ("metric_unit" in patch) update.metric_unit = patch.metric_unit ?? null;
  if ("start_value" in patch) update.start_value = patch.start_value ?? null;
  if ("target_value" in patch) update.target_value = patch.target_value ?? null;
  if ("current_value" in patch) update.current_value = patch.current_value ?? null;
  if ("due_at" in patch) update.due_at = patch.due_at ?? null;
  if ("achieved" in patch) update.achieved = !!patch.achieved;
  if ("achieved_at" in patch) update.achieved_at = patch.achieved_at ?? null;
  if ("owner_user_id" in patch) update.owner_user_id = patch.owner_user_id ?? null;
  if ("confidence" in patch) update.confidence = patch.confidence;

  const { data, error } = await supabase
    .from("strategy_key_results")
    .update(update)
    .eq("id", id)
    .select(strategyKrSelect)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as DbStrategyKeyResult | null;
}

export async function deleteStrategyKeyResult(id: string) {
  const { error } = await supabase.from("strategy_key_results").delete().eq("id", id);
  if (error) throw error;
}