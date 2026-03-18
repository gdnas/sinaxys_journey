select t.tgname as trigger_name,
       case t.tgenabled when 'O' then 'enabled' else t.tgenabled::text end as enabled_state,
       case when (t.tgtype & 1) = 1 then 'ROW' else 'STATEMENT' end as trigger_level,
       concat_ws(' OR ',
         case when (t.tgtype & 4) = 4 then 'INSERT' end,
         case when (t.tgtype & 8) = 8 then 'DELETE' end,
         case when (t.tgtype & 16) = 16 then 'UPDATE' end,
         case when (t.tgtype & 32) = 32 then 'TRUNCATE' end
       ) as events,
       case when (t.tgtype & 2) = 2 then 'BEFORE' else 'AFTER' end as timing,
       p.proname as function_name,
       p.oid::regprocedure::text as function_signature
from pg_trigger t
join pg_class c on c.oid = t.tgrelid
join pg_namespace n on n.oid = c.relnamespace
join pg_proc p on p.oid = t.tgfoid
where n.nspname = 'public'
  and c.relname = 'work_items'
  and not t.tgisinternal
order by timing, events, trigger_name;