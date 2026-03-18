with target_tables as (
  select unnest(array[
    'public.okrs',
    'public.key_results',
    'public.okr_objectives',
    'public.okr_key_results',
    'public.okr_deliverables',
    'public.projects',
    'public.work_items',
    'public.departments',
    'public.profiles'
  ]) as table_name
), table_presence as (
  select table_name, to_regclass(table_name) is not null as exists
  from target_tables
), columns as (
  select 
    c.table_schema || '.' || c.table_name as table_name,
    c.ordinal_position,
    c.column_name,
    c.data_type,
    c.udt_name,
    c.is_nullable,
    c.column_default
  from information_schema.columns c
  where (c.table_schema || '.' || c.table_name) in (select table_name from target_tables)
), fk_constraints as (
  select 
    tc.table_schema || '.' || tc.table_name as table_name,
    tc.constraint_name,
    string_agg(kcu.column_name, ', ' order by kcu.ordinal_position) as columns,
    ccu.table_schema || '.' || ccu.table_name as foreign_table,
    string_agg(ccu.column_name, ', ' order by kcu.ordinal_position) as foreign_columns
  from information_schema.table_constraints tc
  join information_schema.key_column_usage kcu
    on tc.constraint_name = kcu.constraint_name
   and tc.table_schema = kcu.table_schema
   and tc.table_name = kcu.table_name
  join information_schema.constraint_column_usage ccu
    on tc.constraint_name = ccu.constraint_name
   and tc.table_schema = ccu.table_schema
  where tc.constraint_type = 'FOREIGN KEY'
    and (tc.table_schema || '.' || tc.table_name) in (select table_name from target_tables)
  group by 1,2,4
), check_constraints as (
  select 
    tc.table_schema || '.' || tc.table_name as table_name,
    tc.constraint_name,
    cc.check_clause
  from information_schema.table_constraints tc
  join information_schema.check_constraints cc
    on tc.constraint_name = cc.constraint_name
   and tc.constraint_schema = cc.constraint_schema
  where tc.constraint_type = 'CHECK'
    and (tc.table_schema || '.' || tc.table_name) in (select table_name from target_tables)
), policies as (
  select 
    schemaname || '.' || tablename as table_name,
    policyname,
    cmd,
    permissive,
    roles,
    qual,
    with_check
  from pg_policies
  where (schemaname || '.' || tablename) in (select table_name from target_tables)
)
select 'table_presence' as section, json_agg(table_presence order by table_name) as data
from table_presence
union all
select 'columns' as section, json_agg(columns order by table_name, ordinal_position) as data
from columns
union all
select 'foreign_keys' as section, json_agg(fk_constraints order by table_name, constraint_name) as data
from fk_constraints
union all
select 'checks' as section, json_agg(check_constraints order by table_name, constraint_name) as data
from check_constraints
union all
select 'policies' as section, json_agg(policies order by table_name, policyname) as data
from policies;