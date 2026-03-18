select count(*) filter (where exists (select 1 from unnest(coalesce(department_ids, array[]::text[])) x where x !~ '^[0-9a-f-]{36}$')) as invalid_department_ids,
count(*) filter (where department_ids is not null and array_length(department_ids,1) > 0) as with_department_ids
from public.projects;