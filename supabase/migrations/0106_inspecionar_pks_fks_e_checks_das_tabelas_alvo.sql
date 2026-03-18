select n.nspname as schema_name, c.relname as table_name, con.conname as constraint_name, contype, pg_get_constraintdef(con.oid) as definition
from pg_constraint con
join pg_class c on c.oid = con.conrelid
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relname in ('okr_objectives','okr_key_results','okr_deliverables','projects','work_items','departments','profiles')
order by c.relname, con.conname;