-- Testar se a policy events_insert_policy falha quando user_id não tem profile
BEGIN;

-- Verificar se todos os usuários têm profiles
SELECT COUNT(*) as total_users FROM auth.users;
SELECT COUNT(*) as total_profiles FROM public.profiles;

-- Tentar inserir work_item_events com um user_id que não existe em profiles
-- Isso simularia o que pode acontecer se a policy falhar ao buscar o company_id
-- Mas isso deve falhar na FK antes da policy

ROLLBACK;