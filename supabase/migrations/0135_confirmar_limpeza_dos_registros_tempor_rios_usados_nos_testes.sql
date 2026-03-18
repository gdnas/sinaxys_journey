select
  (select count(*) from public.projects where name like '__TEST_SPRINT__%') as projects_left,
  (select count(*) from public.okr_deliverables where title like '__TEST_SPRINT__%') as deliverables_left,
  (select count(*) from public.okr_key_results where title like '__TEST_SPRINT__%') as krs_left,
  (select count(*) from public.okr_objectives where title like '__TEST_SPRINT__%') as okrs_left;