/**
 * Gestão de Projetos - Database Types and Interfaces
 *
 * Fase 1: Estrutura base do módulo de Gestão de Projetos
 *
 * Este arquivo define os tipos TypeScript para as tabelas do banco de dados:
 * - projects
 * - project_members
 * - tasks
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
 * Prioridade da tarefa
 */
export type TaskPriority = "low" | "medium" | "high" | "critical";

/**
 * Status da tarefa
 */
export type TaskStatus = "backlog" | "todo" | "in_progress" | "review" | "done";

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
export interface DbProject {
  id: string;
  tenant_id: string;
  name: string;
  description: string | null;
  department_id: string | null;
  owner_user_id: string;
  created_by_user_id: string;
  visibility: ProjectVisibility;
  admin_private_mode: ProjectAdminPrivateMode;
  status: ProjectStatus;
  start_date: string | null;
  due_date: string | null;
  created_at: string;
  updated_at: string;
}

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
}

/**
 * Linha da tabela tasks
 */
export interface DbTask {
  id: string;
  tenant_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  assignee_user_id: string | null;
  created_by_user_id: string;
  priority: TaskPriority;
  status: TaskStatus;
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
 * Input para criação de tarefa
 */
export interface CreateTaskInput {
  tenant_id: string;
  project_id?: string;
  title: string;
  description?: string;
  assignee_user_id?: string;
  created_by_user_id: string;
  priority?: TaskPriority;
  status?: TaskStatus;
  due_date?: string;
  start_date?: string;
}

/**
 * Input para atualização de tarefa
 */
export interface UpdateTaskInput {
  title?: string;
  description?: string;
  assignee_user_id?: string;
  priority?: TaskPriority;
  status?: TaskStatus;
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
  tasks?: DbTask[];
  member_count?: number;
  task_count?: number;
}

/**
 * Tarefa com dados expandidos
 */
export interface TaskWithDetails extends DbTask {
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
  total_tasks: number;
  completed_tasks: number;
  in_progress_tasks: number;
  overdue_tasks: number;
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
 * Filtros para listagem de tarefas
 */
export interface TaskFilters {
  status?: TaskStatus[];
  priority?: TaskPriority[];
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
 * Opções de ordenação para tarefas
 */
export type TaskSortBy =
  | "title_asc"
  | "title_desc"
  | "created_at_asc"
  | "created_at_desc"
  | "due_date_asc"
  | "due_date_desc"
  | "priority"
  | "status";
