-- Verificar definição de okr_tasks_for_company
SELECT 
    pg_get_functiondef(oid)
FROM pg_proc 
WHERE proname = 'okr_tasks_for_company';
