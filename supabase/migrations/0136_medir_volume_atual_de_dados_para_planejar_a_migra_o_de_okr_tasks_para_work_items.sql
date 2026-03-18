select
  (select count(*) from public.okr_tasks) as okr_tasks_count,
  (select count(*) from public.okr_task_comments) as okr_task_comments_count,
  (select count(*) from public.okr_task_attachments) as okr_task_attachments_count,
  (select count(*) from public.work_items) as work_items_count,
  (select count(*) from public.work_item_comments) as work_item_comments_count,
  (select count(*) from public.work_item_events) as work_item_events_count;