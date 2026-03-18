-- Adicionar parent_id à tabela work_items se não existir
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'work_items' AND column_name = 'parent_id'
    ) THEN
        ALTER TABLE work_items ADD COLUMN parent_id UUID REFERENCES work_items(id) ON DELETE CASCADE;
    END IF;
END $$;

-- Criar tabela work_item_comments
CREATE TABLE IF NOT EXISTS work_item_comments (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar tabela work_item_events
CREATE TABLE IF NOT EXISTS work_item_events (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    work_item_id UUID NOT NULL REFERENCES work_items(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL CHECK (event_type IN ('created', 'status_changed', 'subtask_created', 'subtask_completed', 'comment_added', 'assigned', 'priority_changed')),
    old_value TEXT,
    new_value TEXT,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Habilitar RLS em todas as tabelas
ALTER TABLE work_item_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE work_item_events ENABLE ROW LEVEL SECURITY;

-- Políticas para work_item_comments (baseadas no padrão work_items)
CREATE POLICY "comments_select_policy" ON work_item_comments
FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM work_items wi
        WHERE wi.id = work_item_comments.work_item_id
        AND wi.tenant_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    )
);

CREATE POLICY "comments_insert_policy" ON work_item_comments
FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
        SELECT 1 FROM work_items wi
        WHERE wi.id = work_item_comments.work_item_id
        AND wi.tenant_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    )
    AND user_id = auth.uid()
);

CREATE POLICY "comments_update_policy" ON work_item_comments
FOR UPDATE TO authenticated USING (
    user_id = auth.uid()
);

CREATE POLICY "comments_delete_policy" ON work_item_comments
FOR DELETE TO authenticated USING (
    user_id = auth.uid()
);

-- Políticas para work_item_events (baseadas no padrão work_items)
CREATE POLICY "events_select_policy" ON work_item_events
FOR SELECT TO authenticated USING (
    EXISTS (
        SELECT 1 FROM work_items wi
        WHERE wi.id = work_item_events.work_item_id
        AND wi.tenant_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    )
);

CREATE POLICY "events_insert_policy" ON work_item_events
FOR INSERT TO authenticated WITH CHECK (
    EXISTS (
        SELECT 1 FROM work_items wi
        WHERE wi.id = work_item_events.work_item_id
        AND wi.tenant_id IN (
            SELECT company_id FROM profiles WHERE id = auth.uid()
        )
    )
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_work_item_comments_work_item_id ON work_item_comments(work_item_id);
CREATE INDEX IF NOT EXISTS idx_work_item_comments_created_at ON work_item_comments(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_item_events_work_item_id ON work_item_events(work_item_id);
CREATE INDEX IF NOT EXISTS idx_work_item_events_created_at ON work_item_events(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_work_items_parent_id ON work_items(parent_id);