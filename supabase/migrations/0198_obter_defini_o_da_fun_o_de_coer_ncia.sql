
-- 6. Obter definição da função de coerência de tenant (para seguir o padrão)
SELECT 
    pg_get_functiondef(oid) as function_definition
FROM pg_proc 
WHERE proname = 'ensure_project_tenant_coherence';
