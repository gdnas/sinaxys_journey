/**
 * Project Execution Summary Database Layer
 *
 * Camada de leitura derivada para projetos onde o status e métricas
 * são calculados a partir de work_items.
 *
 * SEGURANÇA: Esta camada APENAS LÊ dados da VIEW v_project_execution_summary
 * Não altera tabelas existentes. Não quebra contratos atuais.
 *
 * A VIEW v_project_execution_summary é:
 * - RISCO ZERO: VIEW APENAS LEITURA
 * - IMPACTO ZERO: Não altera tabelas existentes
 * - COMPATIBILIDADE TOTAL: Mantém todos os contratos existentes
 */

import { supabase } from "@/integrations/supabase/client";

// =====================
// TYPES
// =====================

/**
 * Status derivado do projeto (calculado a partir dos work_items)
 * 
 * Regras:
 * - Se total_work_items = 0 → 'todo'
 * - Se todos work_items = 'done' → 'done'
 * - Se existir algum work_item = 'blocked' → 'blocked'
 * - Se existir algum work_item = 'in_progress' → 'in_progress'
 * - Caso contrário → 'todo'
 */
export type ProjectDerivedStatus = 'todo' | 'in_progress' | 'done' | 'blocked';

/**
 * Linha da VIEW v_project_execution_summary
 */
export interface DbProjectExecutionSummary {
  project_id: string;
  tenant_id: string;
  project_name: string;
  owner_user_id: string;
  key_result_id: string | null;
  deliverable_id: string | null;
  
  // Métricas de work_items
  total_work_items: number;
  done_work_items: number;
  in_progress_work_items: number;
  todo_work_items: number;
  backlog_work_items: number;
  review_work_items: number;
  blocked_work_items: number;
  overdue_work_items: number;
  
  // Métricas derivadas
  progress_pct: number; // 0-100, arredondado
  derived_status: ProjectDerivedStatus;
}

/**
 * Filtros para listagem de execution summaries
 */
export interface ProjectExecutionFilters {
  tenant_id?: string;
  owner_user_id?: string;
  key_result_id?: string;
  deliverable_id?: string;
  derived_status?: ProjectDerivedStatus[];
}

/**
 * Opções de ordenação
 */
export type ProjectExecutionSortBy =
  | "project_name_asc"
  | "project_name_desc"
  | "progress_pct_asc"
  | "progress_pct_desc"
  | "total_work_items_asc"
  | "total_work_items_desc";

// =====================
// CRUD OPERATIONS
// =====================

/**
 * Buscar resumo de execução de um projeto específico
 */
export async function getProjectExecutionSummary(projectId: string): Promise<DbProjectExecutionSummary | null> {
  const { data, error } = await supabase
    .from("v_project_execution_summary")
    .select("*")
    .eq("project_id", projectId)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      // Not found
      return null;
    }
    throw error;
  }

  return data;
}

/**
 * Listar resumos de execução de projetos
 */
export async function listProjectExecutionSummaries(
  filters?: ProjectExecutionFilters,
  sortBy?: ProjectExecutionSortBy,
  page = 0,
  perPage = 50
): Promise<{ rows: DbProjectExecutionSummary[]; total: number }> {
  let query = supabase
    .from("v_project_execution_summary")
    .select("*", { count: "exact" });

  // Aplicar filtros
  if (filters) {
    if (filters.tenant_id) {
      query = query.eq("tenant_id", filters.tenant_id);
    }
    if (filters.owner_user_id) {
      query = query.eq("owner_user_id", filters.owner_user_id);
    }
    if (filters.key_result_id) {
      query = query.eq("key_result_id", filters.key_result_id);
    }
    if (filters.deliverable_id) {
      query = query.eq("deliverable_id", filters.deliverable_id);
    }
    if (filters.derived_status && filters.derived_status.length > 0) {
      query = query.in("derived_status", filters.derived_status);
    }
  }

  // Aplicar ordenação
  if (sortBy) {
    switch (sortBy) {
      case "project_name_asc":
        query = query.order("project_name", { ascending: true });
        break;
      case "project_name_desc":
        query = query.order("project_name", { ascending: false });
        break;
      case "progress_pct_asc":
        query = query.order("progress_pct", { ascending: true });
        break;
      case "progress_pct_desc":
        query = query.order("progress_pct", { ascending: false });
        break;
      case "total_work_items_asc":
        query = query.order("total_work_items", { ascending: true });
        break;
      case "total_work_items_desc":
        query = query.order("total_work_items", { ascending: false });
        break;
    }
  } else {
    // Ordenação padrão: por nome do projeto
    query = query.order("project_name", { ascending: true });
  }

  // Paginação
  const start = page * perPage;
  const end = start + perPage - 1;
  query = query.range(start, end);

  const { data, error, count } = await query;

  if (error) throw error;

  return {
    rows: (data ?? []) as DbProjectExecutionSummary[],
    total: typeof count === "number" ? count : (data ?? []).length,
  };
}

/**
 * Buscar múltiplos resumos por IDs de projeto
 */
export async function getProjectExecutionSummariesByProjectIds(
  projectIds: string[]
): Promise<DbProjectExecutionSummary[]> {
  if (projectIds.length === 0) {
    return [];
  }

  const { data, error } = await supabase
    .from("v_project_execution_summary")
    .select("*")
    .in("project_id", projectIds);

  if (error) throw error;

  return (data ?? []) as DbProjectExecutionSummary[];
}

// =====================
// HELPER FUNCTIONS
// =====================

/**
 * Calcular status derivado localmente (para validação ou testes)
 * 
 * NOTA: Esta função é usada apenas para validação.
 * Na prática, use o campo `derived_status` da VIEW.
 */
export function calculateDerivedStatus(
  totalWorkItems: number,
  doneWorkItems: number,
  inProgressWorkItems: number,
  blockedWorkItems: number
): ProjectDerivedStatus {
  if (totalWorkItems === 0) {
    return 'todo';
  }
  if (blockedWorkItems > 0) {
    return 'blocked';
  }
  if (inProgressWorkItems > 0) {
    return 'in_progress';
  }
  if (totalWorkItems === doneWorkItems) {
    return 'done';
  }
  return 'todo';
}

/**
 * Calcular progresso localmente (para validação ou testes)
 * 
 * NOTA: Esta função é usada apenas para validação.
 * Na prática, use o campo `progress_pct` da VIEW.
 */
export function calculateProgressPct(
  totalWorkItems: number,
  doneWorkItems: number
): number {
  if (totalWorkItems === 0) {
    return 0;
  }
  return Math.round((doneWorkItems / totalWorkItems) * 100);
}

/**
 * Obter cor do status derivado para UI
 */
export function getDerivedStatusColor(status: ProjectDerivedStatus): string {
  switch (status) {
    case 'todo':
      return 'bg-slate-100 text-slate-700 border-slate-300';
    case 'in_progress':
      return 'bg-blue-100 text-blue-700 border-blue-300';
    case 'done':
      return 'bg-green-100 text-green-700 border-green-300';
    case 'blocked':
      return 'bg-red-100 text-red-700 border-red-300';
    default:
      return 'bg-gray-100 text-gray-700 border-gray-300';
  }
}

/**
 * Obter label do status derivado para UI (português)
 */
export function getDerivedStatusLabel(status: ProjectDerivedStatus): string {
  switch (status) {
    case 'todo':
      return 'A fazer';
    case 'in_progress':
      return 'Em andamento';
    case 'done':
      return 'Concluído';
    case 'blocked':
      return 'Bloqueado';
    default:
      return 'Desconhecido';
  }
}
