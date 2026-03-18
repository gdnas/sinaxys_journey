select policyname, cmd, qual, with_check
from pg_policies
where schemaname = 'public'
  and tablename = 'work_items'
order by policyname;