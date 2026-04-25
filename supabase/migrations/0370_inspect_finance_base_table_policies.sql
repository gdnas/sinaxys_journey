select tablename, policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('finance_accounts','finance_fiscal_periods','finance_scenarios')
order by tablename, policyname;