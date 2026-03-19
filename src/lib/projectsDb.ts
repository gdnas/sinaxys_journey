/**
 * Gestão de Projetos - Database Types and Interfaces
 *
 * Fase 1: Estrutura base do módulo de Gestão de Projetos
 *
 * Este arquivo define os tipos TypeScript para as tabelas do banco de dados:
 * - projects
 * - project_members
 * - work_items (execução real do projeto)
 *
 * NOTA: A tabela real no banco é "work_items", que é usada para execução de projetos.
 */

// =====================
// ENUMS
// =====================

/**
 * Visibilidade do projeto
 */
export type ProjectVisibility = "public" | "private";

/**
 * Modo de privacidade administrativa
 */
export type ProjectAdminPrivateMode = null | "admin_only" | "heads_only";

/**
 * Status do projeto
 */
export type ProjectStatus = "not_started" | "on_track" | "at_risk" | "delayed" | "completed";

/**
 * Prioridade do work item (tarefa) de projeto
 */
export type ProjectWorkItemPriority = "low" | "medium" | "high" | "critical";

/**
 * Status do work item (tarefa) de projeto
 */
export type ProjectWorkItemStatus = "backlog" | "todo" | "in_progress" | "review" | "done";

/**
 * Papel do membro no projeto
 */
export type ProjectMemberRole = "member" | "owner" | "viewer" | "editor";

// =====================
// DATABASE ROWS
// =====================

/**
 * Linha da tabela projects
 */
export type DbProject = {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  department_id: string | null;
  department_ids?: string[] | null;
  key_result_id?: string | null;
  deliverable_id?: string | null;
  owner_user_id: string;
  created_by_user_id: string;
  visibility: string;
  admin_private_mode: string | null;
  status: string;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
};

/**
 * Linha da tabela project_members
 */
export interface DbProjectMember {
  id: string;
  tenant_id: string;
  project_id: string;
  user_id: string;
  role_in_project: ProjectMemberRole;
  created_at: string;
};

/**
 * Linha da tabela work_items (execução de projetos)
 *
 * NOTA: A tabela real no banco de dados é "work_items", não "tasks".
 * Este tipo representa um work_item vinculado a um projeto.
 */
export interface DbProjectWorkItem {
  id: string;
  tenant_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  assignee_user_id: string | null;
  created_by_user_id: string;
  priority: ProjectWorkItemPriority;
  status: ProjectWorkItemStatus;
  due_date: string | null;
  start_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// =====================
// INPUT TYPES
// =====================

/**
 * Input para criação de projeto
 */
export interface CreateProjectInput {
  tenant_id: string;
  name: string;
  description?: string;
  department_id?: string;
  department_ids?: string[];
  key_result_id?: string;
  deliverable_id?: string;
  owner_user_id: string;
  created_by_user_id: string;
  visibility?: ProjectVisibility;
  admin_private_mode?: ProjectAdminPrivateMode;
  status?: ProjectStatus;
  start_date?: string;
  due_date?: string;
}

/**
 * Input para atualização de projeto
 */
export interface UpdateProjectInput {
  name?: string;
  description?: string;
  department_id?: string;
  department_ids?: string[] | null;
  key_result_id?: string | null;
  deliverable_id?: string | null;
  visibility?: ProjectVisibility;
  admin_private_mode?: ProjectAdminPrivateMode;
  status?: ProjectStatus;
  start_date?: string;
  due_date?: string;
}

/**
 * Input para criação de membro de projeto
 */
export interface CreateProjectMemberInput {
  tenant_id: string;
  project_id: string;
  user_id: string;
  role_in_project?: ProjectMemberRole;
}

/**
 * Input para criação de work item de projeto
 *
 * NOTA: A tabela real no banco é "work_items", não "tasks".
 */
export interface CreateProjectWorkItemInput {
  tenant_id: string;
  project_id?: string;
  title: string;
  description?: string;
  assignee_user_id?: string;
  created_by_user_id: string;
  priority?: ProjectWorkItemPriority;
  status?: ProjectWorkItemStatus;
  due_date?: string;
  start_date?: string;
}

/**
 * Input para atualização de work item de projeto
 *
 * NOTA: A tabela real no banco é "work_items", não "tasks".
 */
export interface UpdateProjectWorkItemInput {
  title?: string;
  description?: string;
  assignee_user_id?: string;
  priority?: ProjectWorkItemPriority;
  status?: ProjectWorkItemStatus;
  due_date?: string;
  start_date?: string;
  completed_at?: string;
}

// =====================
// OUTPUT TYPES
// =====================

/**
 * Projeto com dados expandidos
 */
export interface ProjectWithDetails extends DbProject {
  members?: DbProjectMember[];
  work_items?: DbProjectWorkItem[];
  member_count?: number;
  work_item_count?: number;
}

/**
 * Work item de projeto com dados expandidos
 */
export interface ProjectWorkItemWithDetails extends DbProjectWorkItem {
  project?: DbProject;
  assignee?: {
    id: string;
    name: string;
    avatar_url?: string;
  };
}

/**
 * Projeto com estatísticas
 */
export interface ProjectStats {
  total_projects: number;
  by_status: Record<ProjectStatus, number>;
  by_visibility: Record<ProjectVisibility, number>;
  total_work_items: number;
  completed_work_items: number;
  in_progress_work_items: number;
  overdue_work_items: number;
}

// =====================
// HELPER TYPES
// =====================

/**
 * Filtros para listagem de projetos
 */
export interface ProjectFilters {
  status?: ProjectStatus[];
  visibility?: ProjectVisibility[];
  department_id?: string[];
  owner_user_id?: string;
  search?: string;
}

/**
 * Filtros para listagem de work items de projeto
 *
 * NOTA: A tabela real no banco é "work_items", não "tasks".
 */
export interface ProjectWorkItemFilters {
  status?: ProjectWorkItemStatus[];
  priority?: ProjectWorkItemPriority[];
  project_id?: string[];
  assignee_user_id?: string;
  search?: string;
  due_before?: string;
  due_after?: string;
}

/**
 * Opções de ordenação para projetos
 */
export type ProjectSortBy =
  | "name_asc"
  | "name_desc"
  | "created_at_asc"
  | "created_at_desc"
  | "due_date_asc"
  | "due_date_desc"
  | "status";

/**
 * Opções de ordenação para work items de projeto
 *
 * NOTA: A tabela real no banco é "work_items", não "tasks".
 */
export type ProjectWorkItemSortBy =
  | "title_asc"
  | "title_desc"
  | "created_at_asc"
  | "created_at_desc"
  | "due_date_asc"
  | "due_date_desc"
  | "priority"
  | "status";

// =====================
// DATABASE FUNCTIONS
// =====================

/**
 * Busca work_items de uma empresa para o dashboard
 *
 * @param companyId ID da empresa
 * @param opts Opções de filtro e ordenação
 * @returns Array de work_items com contexto
 */
export async function listWorkItemsForDashboard(
  companyId: string,
  opts?: {
    status?: string[];
    assignee_user_id?: string;
    from?: string;
    to?: string;
  }
) {
  const { data, error } = await supabase
    .from("work_items")
    .select(`
      id,
      tenant_id,
      project_id,
      title,
      description,
      assignee_user_id,
      created_by_user_id,
      priority,
      status,
      due_date,
      start_date,
      completed_at,
      created_at,
      updated_at
    `)
    .eq("tenant_id", companyId)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as unknown;
}

/**
 * Busca work_items de um departamento para o dashboard
 *
 * @param companyId ID da empresa
 * @param departmentId ID do departamento
 * @param opts Opções de filtro e ordenação
 * @returns Array de work_items com contexto
 */
export async function listWorkItemsForDepartment(
  companyId: string,
  departmentId: string,
  opts?: {
    status?: string[];
    assignee_user_id?: string;
    from?: string;
    to?: string;
  }
) {
  const { data, error } = await supabase
    .from("work_items wi")
    .select(`
      wi.id,
      wi.tenant_id,
      wi.project_id,
      wi.title,
      wi.description,
      wi.assignee_user_id,
      wi.created_by_user_id,
      wi.priority,
      wi.status,
      wi.due_date,
      wi.start_date,
      wi.completed_at,
      wi.created_at,
      wi.updated_at
    `)
    .eq("wi.tenant_id", companyId)
    .innerJoin(
      "projects p",
      "p.id",
      "p.tenant_id",
      "p.department_id"
    )
    .eq("p.tenant_id", companyId)
    .eq("p.department_id", departmentId)
    .order("wi.due_date", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as unknown;
}

/**
 * Busca work_items de um usuário para o dashboard
 *
 * @param companyId ID da empresa
 * @param userId ID do usuário
 * @param opts Opções de filtro e ordenação
 * @returns Array de work_items com contexto
 */
export async function listWorkItemsForUser(
  companyId: string,
  userId: string,
  opts?: {
    status?: string[];
    from?: string;
    to?: string;
  }
) {
  const { data, error } = await supabase
    .from("work_items")
    .select(`
      id,
      tenant_id,
      project_id,
      title,
      description,
      assignee_user_id,
      created_by_user_id,
      priority,
      status,
      due_date,
      start_date,
      completed_at,
      created_at,
      updated_at
    `)
    .eq("tenant_id", companyId)
    .or("assignee_user_id", userId)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as unknown;
}

/**
 * Busca work_items de um projeto para o dashboard
 *
 * @param companyId ID da empresa
 * @param projectId ID do projeto
 * @param opts Opções de filtro e ordenação
 * @returns Array de work_items com contexto
 */
export async function listWorkItemsByProject(
  companyId: string,
  projectId: string,
  opts?: {
    status?: string[];
    assignee_user_id?: string;
    from?: string;
    to?: string;
  }
) {
  const { data, error } = await supabase
    .from("work_items")
    .select(`
      id,
      tenant_id,
      project_id,
      title,
      description,
      assignee_user_id,
      created_by_user_id,
      priority,
      status,
      due_date,
      start_date,
      completed_at,
      created_at,
      updated_at
    `)
    .eq("tenant_id", companyId)
    .eq("project_id", projectId)
    .order("due_date", { ascending: true, nullsFirst: false });

  if (error) throw error;
  return (data ?? []) as unknown;
}

/**
 * Busca work_items ativos de uma empresa para o dashboard
 *
 * @param companyId ID da empresa
 * @returns Contagem de work_items por status
 */
export async function getWorkItemsStats(companyId: string) {
  const { data, error } = await supabase
    .from("work_items")
    .select("status", { count: "exact" })
    .eq("tenant_id", companyId)
    .group("status");

  if (error) throw error;

  const stats: Record<string, number> = {};
  data.forEach((row: any) => {
    stats[row.status] = row.count;
  });

  return {
    total_work_items: stats["todo"] + stats["in_progress"] + stats["done"] || 0,
    open_work_items: stats["todo"] + stats["in_progress"] || 0,
    completed_work_items: stats["done"] || 0,
    in_progress_work_items: stats["in_progress"] || 0,
    overdue_work_items: 0, // Será calculado no frontend
  };
}

// =====================
// HELPER FUNCTIONS
// =====================

/**
 * Formata data para exibição
 */
function formatDate(dateString: string | null): string {
  if (!dateString) return "Sem data";
  return new Date(dateString).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Formata prioridade para exibição
 */
function getPriorityLabel(priority: string): string {
  const labels: Record<string, string> = {
    "critical": "Crítico",
    "high": "Alta",
    "medium": "Média",
    "low": "Baixa",
  };
  return labels[priority] ?? priority;
}

/**
 * Formata status para exibição
 */
function getStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    "backlog": "Backlog",
    "todo": "A fazer",
    "in_progress": "Em andamento",
    "review": "Em revisão",
    "done": "Concluído",
  };
  return labels[status] ?? status;
}

/**
 * Calcula se uma tarefa está atrasada
 */
function isTaskOverdue(dueDate: string | null, status: string): boolean {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date() && status !== "done";
}

/**
 * Formata data com data de hoje
 */
function formatDateWithToday(dueDate: string | null): string {
  if (!dueDate) return "Sem prazo";
  
  const due = new Date(dueDate);
  const today = new Date();
  const diff = Math.ceil((today.getTime() - due.getTime()) / (1000 * 60 * 24)); // dias de diferença arredondado
  const isLate = isTaskOverdue(dueDate, null, "done");
  
  return `${formatDate(dueDate)}${isLate ? ' (atrasado)' : ''}`;
}

/**
 * Calcula progresso percentual
 */
function calculateProgress(completed: number, total: number): number {
  if (!total || total === 0) return 0;
  return Math.round((completed / total) * 100);
}

/**
 * Calcula progresso percentual agrupado por status
 */
export function calculateStatusProgress(stats: Record<string, number>): Record<string, number> {
  const done = stats["done"] ?? 0;
  const in_progress = stats["in_progress"] ?? 0;
  const todo = stats["todo"] ?? 0;
  const total = done + in_progress + todo;
  
  return {
    total,
    done: total > 0 ? Math.round((done / total) * 100) : 0,
    in_progress: total > 0 ? Math.round((in_progress / total) * 100) : 0,
  };
}