-- Ver a função can_manage_okr_scope
SELECT 
  pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'can_manage_okr_scope';