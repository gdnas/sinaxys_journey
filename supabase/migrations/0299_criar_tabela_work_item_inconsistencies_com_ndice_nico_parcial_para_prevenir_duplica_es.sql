-- ============================================
-- MIGRATION: KAIROOS 2.0 Fase 1.5A - Integridade e Diagnóstico
-- Tabela para rastrear inconsistências em work_items
-- ============================================

-- Criar tabela de inconsistências
CREATE TABLE IF NOT EXISTS work_item_inconsistencies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  type TEXT NOT NULL, -- 'invalid_status', 'null_status', 'orphan_deliverable', etc.
  description TEXT,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  resolved_at TIMESTAMP WITH TIME ZONE
);

-- ÍNDICE ÚNICO PARCIAL (CRÍTICO)
-- Garante apenas 1 inconsistency aberta por (work_item_id, type)
CREATE UNIQUE INDEX IF NOT EXISTS idx_work_item_inconsistencies_open_unique
ON work_item_inconsistencies (work_item_id, type)
WHERE resolved_at IS NULL;

-- Comentário explicativo
COMMENT ON INDEX idx_work_item_inconsistencies_open_unique IS
'Garante que não há inconsistências duplicadas abertas para o mesmo work_item e tipo.
Previne que múltiplos updates ou scans criem registros duplicados.

KAIROOS 2.0 Fase 1.5A - Integridade e Diagnóstico';

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_work_item_inconsistencies_project_id
ON work_item_inconsistencies(project_id) WHERE resolved_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_work_item_inconsistencies_tenant_id
ON work_item_inconsistencies(tenant_id) WHERE resolved_at IS NULL;

COMMENT ON TABLE work_item_inconsistencies IS
'Tabela para rastrear inconsistências em work_items.
Cada registro representa um problema detectado que precisa ser resolvido.

Status:
- resolved_at IS NULL: inconsistência ativa
- resolved_at NOT NULL: inconsistência resolvida (histórico)

Tipos de inconsistência:
- invalid_status: work_item com status fora do domínio válido
- null_status: work_item com status NULL ou vazia
- orphan_deliverable: work_item com deliverable_id que não existe
- (mais tipos podem ser adicionados no futuro)';
