select
  (select count(*) from public.okr_tasks) as okr_tasks_count,
  (select count(*) from public.work_items where legacy_okr_task_id is not null) as migrated_okr_tasks_count,
  (select count(*) from public.work_item_comments wc join public.work_items wi on wi.id = wc.work_item_id where wi.legacy_okr_task_id is not null) as migrated_okr_task_comments_count;