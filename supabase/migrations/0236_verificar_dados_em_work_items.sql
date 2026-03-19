-- Verificar se existem work_items no banco
SELECT COUNT(*) as count FROM public.work_items WHERE tenant_id = (SELECT id FROM public.companies LIMIT 1);
