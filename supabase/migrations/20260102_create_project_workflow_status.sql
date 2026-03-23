-- KAIROOS 2.0 Fase 1: Migration 2
-- Criar tabela project_workflow_status (FONTE DA VERDADE para board)

CREATE TABLE IF NOT EXISTS project_workflow_status (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  status_key TEXT NOT NULL,
  display_name TEXT NOT NULL,
  display_order INTEGER NOT NULL,
  color TEXT DEFAULT 'bg-slate-100',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(project_id, status_key)
);

CREATE INDEX IF NOT EXISTS idx_project_workflow_status_project_id ON project_workflow_status(project_id);

-- RLS (herdar de projects)
ALTER TABLE project_workflow_status ENABLE ROW LEVEL SECURITY;

-- Policy SELECT: Quem pode ver o projeto pode ver os status
CREATE POLICY project_workflow_status_select_policy
  ON project_workflow_status FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = project_workflow_status.project_id
    AND can_view_project(projects.id, projects.tenant_id, projects.owner_user_id, projects.department_id, projects.department_ids)
  ));

-- Policy INSERT: Quem pode gerenciar o projeto pode criar status
CREATE POLICY project_workflow_status_insert_policy
  ON project_workflow_status FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = project_workflow_status.project_id
    AND can_manage_project(projects.tenant_id, projects.department_id, projects.department_ids)
  ));

-- Policy UPDATE: Quem pode gerenciar o projeto pode atualizar status
CREATE POLICY project_workflow_status_update_policy
  ON project_workflow_status FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = project_workflow_status.project_id
    AND can_manage_project(projects.tenant_id, projects.department_id, projects.department_ids)
  ));

-- Policy DELETE: Quem pode gerenciar o projeto pode deletar status
CREATE POLICY project_workflow_status_delete_policy
  ON project_workflow_status FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM projects WHERE projects.id = project_workflow_status.project_id
    AND can_manage_project(projects.tenant_id, projects.department_id, projects.department_ids)
  ));
