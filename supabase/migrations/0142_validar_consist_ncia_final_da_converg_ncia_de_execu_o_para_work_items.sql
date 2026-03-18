select
  (select count(*) from public.okr_tasks) as legacy_okr_tasks,
  (select count(*) from public.work_items where key_result_id is not null) as okr_context_work_items,
  (select count(*) from public.work_items where legacy_okr_task_id is not null) as migrated_from_okr_tasks,
  (select count(*) from public.work_items where legacy_okr_task_id is not null and key_result_id is null) as migrated_without_kr,
  (select count(*) from public.work_items where legacy_okr_task_id is not null and deliverable_id is null) as migrated_without_deliverable,
  (select count(*) from public.work_item_comments wc join public.work_items wi on wi.id = wc.work_item_id where wi.key_result_id is not null) as okr_work_item_comments,
  (select count(*) from public.work_item_events we join public.work_items wi on wi.id = we.work_item_id where wi.key_result_id is not null) as okr_work_item_events;