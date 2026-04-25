select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('finance_accounts','finance_fiscal_periods','finance_scenarios','finance_versions','finance_version_lines')
order by tablename, policyname;