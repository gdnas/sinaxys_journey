select tablename, indexname, indexdef
from pg_indexes
where schemaname = 'public'
  and tablename in ('finance_accounts','finance_fiscal_periods','finance_scenarios','finance_scenario_assumptions','finance_versions','finance_version_lines')
order by tablename, indexname;