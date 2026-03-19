
-- 6. Verificar estrutura da tabela work_item_comments
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'work_item_comments'
ORDER BY ordinal_position;
