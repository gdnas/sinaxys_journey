select tgname, tgrelid::regclass::text as table_name, pg_get_triggerdef(oid) as definition
from pg_trigger
where not tgisinternal
  and tgrelid::regclass::text in ('public.finance_accounts','public.finance_fiscal_periods','public.finance_scenarios','public.finance_versions','public.finance_version_lines')
order by table_name, tgname;