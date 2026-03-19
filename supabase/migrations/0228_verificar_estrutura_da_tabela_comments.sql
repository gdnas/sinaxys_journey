
-- 4. Verificar estrutura da tabela comments
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns 
WHERE table_schema = 'public' 
  AND table_name = 'comments'
ORDER BY ordinal_position;
