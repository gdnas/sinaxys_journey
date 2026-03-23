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
 * NOTA: Embora este arquivo use o termo "ProjectWorkItem" nos tipos,
 * a tabela real no banco é "work_items", que é usada para execução de projetos.
 */

// =====================
// IMPORTS
// =====================

import type { TemplateType } from '@/lib/templateWorkflowDb';

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
export interface DbProject {
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
  visibility: ProjectVisibility;
  admin_private_mode: ProjectAdminPrivateMode;
  status: ProjectStatus;
  start_date: string | null;
  due_date: string | null;
  template_type: TemplateType; // NOVO - KAIROOS 2.0 Fase 1: OBRIGATÓRIO e IMUTÁVEL
  created_at: string;
  updated_at: string;
}

/**
 * Linha da tabela project_workflow_status (KAIROOS 2.0 Fase 1)
 */
export interface DbProjectWorkflowStatus {
  id: string;
  project_id: string;
  status_key: string;
  display_name: string;
  display_order: number;
  color: string;
  created_at: string;
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
  template_type?: TemplateType; // NOVO - KAIROOS 2.0 Fase 1
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
 * NOTA: A tabela real no banco é "work_items".
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
 * NOTA: A tabela real no banco é "work_items".
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
  workflow_statuses?: DbProjectWorkflowStatus[]; // NOVO - KAIROOS 2.0 Fase 1
  member_count?: number;
  work_item_count?: number;
}

/**
 * Work item de projeto com dados expandidos
 *
 * NOTA: A tabela real no banco é "work_items".
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
  template_type?: TemplateType[]; // NOVO - KAIROOS 2.0 Fase 1
  // department_id filter can match primary id or any department in department_ids
  department_id?: string[];
  owner_user_id?: string;
  search?: string;
}

/**
 * Filtros para listagem de work items de projeto
 *
 * NOTA: A tabela real no banco é "work_items".
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
 * NOTA: A tabela real no banco é "work_items".
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