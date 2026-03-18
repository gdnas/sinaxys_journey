-- Ver a função can_view_okr_scope
SELECT 
  pg_get_functiondef(oid)
FROM pg_proc
WHERE proname = 'can_view_okr_scope';