-- Verificar se okr_tasks tem start_date
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns
WHERE table_name = 'okr_tasks'
  AND column_name = 'start_date';