-- KAIROOS 2.0 Fase 1: Migration 1
-- Adicionar campo template_type à tabela projects

ALTER TABLE projects ADD COLUMN IF NOT EXISTS template_type TEXT NOT NULL DEFAULT 'PROCESS';

ALTER TABLE projects 
  ADD CONSTRAINT IF NOT EXISTS projects_template_type_check 
  CHECK (template_type IN ('BUILD', 'PROCESS', 'PIPELINE', 'CAMPAIGN'));

-- Índice para consultas por template_type
CREATE INDEX IF NOT EXISTS idx_projects_template_type ON projects(template_type);
