select table_name, column_name, data_type, is_nullable, column_default
from information_schema.columns
where table_schema = 'public'
  and table_name in ('finance_accounts','finance_fiscal_periods','finance_scenarios','finance_scenario_assumptions','finance_versions','finance_version_lines')
order by table_name, ordinal_position;