SELECT tgname, tgtype::integer, pg_get_triggerdef(oid) as definition
FROM pg_trigger
WHERE tgrelid = 'public.work_items'::regclass;
