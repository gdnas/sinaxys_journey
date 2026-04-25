select indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('finance_accounts','finance_version_lines')
order by tablename, indexname;