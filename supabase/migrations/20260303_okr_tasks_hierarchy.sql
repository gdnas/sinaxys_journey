-- ============================================================================
-- MIGRATION: Hierarquia Explícita (4 níveis de subitens)
-- ============================================================================

-- 1. Novos campos em okr_tasks
ALTER TABLE okr_tasks
    ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES okr_tasks(id) ON DELETE CASCADE,
    ADD COLUMN IF NOT EXISTS depth INTEGER NOT NULL DEFAULT 0,
    ADD COLUMN IF NOT EXISTS level_type TEXT NOT NULL DEFAULT 'TASK',
    ADD COLUMN IF NOT EXISTS task_hierarchy JSONB NOT NULL DEFAULT '{}'::jsonb;

-- 2. Índices para performance
CREATE INDEX IF NOT EXISTS idx_task_parent ON okr_tasks(parent_task_id);
CREATE INDEX IF NOT EXISTS idx_task_depth ON okr_tasks(depth);
CREATE INDEX IF NOT EXISTS idx_task_level_type ON okr_tasks(level_type);

-- 3. Backfill: inicializar campos para tarefas existentes
-- Tarefas existentes são consideradas depth=0 e level_type='TASK'
UPDATE okr_tasks
SET 
    level_type = 'TASK',
    depth = 0,
    task_hierarchy = '{}'::jsonb
WHERE level_type IS NULL;

-- 4. Campo de data de início para tarefas (para entrega de datas)
ALTER TABLE okr_tasks
    ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Backfill: usar created_at como start_date para tarefas existentes
UPDATE okr_tasks
SET start_date = created_at
WHERE start_date IS NULL OR start_date = CURRENT_TIMESTAMP;
