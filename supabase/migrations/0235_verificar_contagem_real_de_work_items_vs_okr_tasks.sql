
-- Verificar contagem real de work_items vs okr_tasks na empresa
SELECT 
    'okr_tasks' as tabela,
    COUNT(*) as total_okr_tasks
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'okr_tasks'

UNION ALL

SELECT 
    'work_items' as tabela,
    COUNT(*) as total_work_items
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_name = 'work_items';
