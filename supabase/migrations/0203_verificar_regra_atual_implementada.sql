
-- Diagnóstico: Verificar regra atual de negócio na função
SELECT 
    pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'ensure_project_tenant_coherence';
