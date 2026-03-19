
-- 4. Verificar estrutura da tabela work_item_events
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'work_item_events'
ORDER BY ordinal_position;
