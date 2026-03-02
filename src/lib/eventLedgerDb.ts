import { supabase } from "@/integrations/supabase/client";

export type EventSourceModule = "OKR" | "TRACKS" | "POINTS" | "PDI";
export type EventType = string;

export type CompanyEventRow = {
  id: string;
  company_id: string;
  user_id: string;
  source_module: EventSourceModule;
  event_type: EventType;
  entity_type: string;
  entity_id: string | null;
  payload: any;
  occurred_at: string;
  created_at: string;
};

export type PerformanceScoreRow = {
  id: string;
  company_id: string;
  user_id: string;
  cycle_id: string;
  score: number;
  breakdown: any;
  execution_score: number;
  result_score: number;
  learning_score: number;
  consistency_score: number;
  updated_at: string;
  created_at: string;
};

/**
 * Lista eventos de uma empresa para um usuário específico
 */
export async function listEventsForUser(
  companyId: string,
  userId: string,
  opts?: {
    sourceModule?: EventSourceModule;
    eventType?: string;
    from?: string; // ISO date
    to?: string; // ISO date
    limit?: number;
  }
) {
  let query = supabase
    .from("company_event_ledger")
    .select("*")
    .eq("company_id", companyId)
    .eq("user_id", userId)
    .order("occurred_at", { ascending: false });

  if (opts?.sourceModule) {
    query = query.eq("source_module", opts.sourceModule);
  }
  if (opts?.eventType) {
    query = query.eq("event_type", opts.eventType);
  }
  if (opts?.from) {
    query = query.gte("occurred_at", opts.from);
  }
  if (opts?.to) {
    query = query.lte("occurred_at", opts.to);
  }

  const limit = opts?.limit ?? 50;
  query = query.limit(Math.max(1, Math.min(500, limit)));

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CompanyEventRow[];
}

/**
 * Lista eventos de toda a empresa (para dashboard de admin/head)
 */
export async function listEventsForCompany(
  companyId: string,
  opts?: {
    sourceModule?: EventSourceModule;
    eventType?: string;
    from?: string;
    to?: string;
    limit?: number;
  }
) {
  let query = supabase
    .from("company_event_ledger")
    .select("*")
    .eq("company_id", companyId)
    .order("occurred_at", { ascending: false });

  if (opts?.sourceModule) {
    query = query.eq("source_module", opts.sourceModule);
  }
  if (opts?.eventType) {
    query = query.eq("event_type", opts.eventType);
  }
  if (opts?.from) {
    query = query.gte("occurred_at", opts.from);
  }
  if (opts?.to) {
    query = query.lte("occurred_at", opts.to);
  }

  const limit = opts?.limit ?? 100;
  query = query.limit(Math.max(1, Math.min(1000, limit)));

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as CompanyEventRow[];
}

/**
 * Registra um evento manualmente no ledger
 * (útil para eventos customizados ou integrações externas)
 */
export async function recordManualEvent(params: {
  companyId: string;
  userId: string;
  sourceModule: EventSourceModule;
  eventType: string;
  entityType: string;
  entityId?: string;
  payload: any;
  occurredAt?: string;
}) {
  const { error } = await supabase.rpc("record_company_event", {
    p_company_id: params.companyId,
    p_user_id: params.userId,
    p_source_module: params.sourceModule,
    p_event_type: params.eventType,
    p_entity_type: params.entityType,
    p_entity_id: params.entityId ?? null,
    p_payload: params.payload ?? {},
    p_occurred_at: params.occurredAt ?? null,
  });
  if (error) throw error;
}

/**
 * Busca performance score de um usuário em um ciclo
 */
export async function getPerformanceScore(
  companyId: string,
  userId: string,
  cycleId?: string
) {
  let query = supabase
    .from("performance_scores")
    .select("*")
    .eq("company_id", companyId)
    .eq("user_id", userId);

  if (cycleId) {
    query = query.eq("cycle_id", cycleId);
  }

  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return (data ?? null) as PerformanceScoreRow | null;
}

/**
 * Lista performance scores de todos os usuários de uma empresa em um ciclo
 */
export async function listPerformanceScores(
  companyId: string,
  cycleId?: string
) {
  let query = supabase
    .from("performance_scores")
    .select("*,user_id")
    .eq("company_id", companyId)
    .order("score", { ascending: false });

  if (cycleId) {
    query = query.eq("cycle_id", cycleId);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as PerformanceScoreRow[];
}

/**
 * Recalcula performance de um usuário manualmente
 */
export async function recalculateUserPerformance(
  companyId: string,
  userId: string,
  cycleId?: string
) {
  const { data, error } = await supabase.rpc("calculate_user_performance", {
    p_company_id: companyId,
    p_user_id: userId,
    p_cycle_id: cycleId ?? null,
  });
  if (error) throw error;
  return data as any;
}

/**
 * Recalcula performance de todos os usuários da empresa
 */
export async function recalculateAllPerformances(
  companyId: string,
  cycleId?: string
) {
  const { data, error } = await supabase.rpc("recalculate_all_performances", {
    p_company_id: companyId,
    p_cycle_id: cycleId ?? null,
  });
  if (error) throw error;
  return data as any[];
}

/**
 * Busca eventos agregados por tipo para analytics
 */
export async function getEventsByType(
  companyId: string,
  opts?: {
    from?: string;
    to?: string;
    userId?: string;
  }
) {
  let query = supabase
    .from("company_event_ledger")
    .select("event_type, source_module, count")
    .eq("company_id", companyId);

  if (opts?.userId) {
    query = query.eq("user_id", opts.userId);
  }
  if (opts?.from) {
    query = query.gte("occurred_at", opts.from);
  }
  if (opts?.to) {
    query = query.lte("occurred_at", opts.to);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as any[];
}

/**
 * Helper para formatar payload de evento
 */
export function buildEventPayload(base: any, extras?: any) {
  return {
    ...base,
    ...extras,
    _timestamp: new Date().toISOString(),
  };
}