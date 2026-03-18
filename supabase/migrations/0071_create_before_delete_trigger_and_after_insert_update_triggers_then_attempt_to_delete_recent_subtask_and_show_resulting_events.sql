-- Replace existing single trigger with BEFORE DELETE and AFTER INSERT/UPDATE triggers
DROP TRIGGER IF EXISTS trigger_log_work_item_events ON public.work_items;

CREATE TRIGGER trigger_log_work_item_events_after
AFTER INSERT OR UPDATE ON public.work_items
FOR EACH ROW EXECUTE FUNCTION public.log_work_item_event();

CREATE TRIGGER trigger_log_work_item_events_before_delete
BEFORE DELETE ON public.work_items
FOR EACH ROW EXECUTE FUNCTION public.log_work_item_event();

-- Test: delete a recent subtask (if exists) to verify trigger behavior
-- We'll try deleting the subtask with id '9b809715-5271-4a65-9d17-a88b668f3e5d' if present
DELETE FROM public.work_items WHERE id = '9b809715-5271-4a65-9d17-a88b668f3e5d' RETURNING id;

-- Show events for parent after deletion
SELECT * FROM public.work_item_events WHERE work_item_id = '748ffad4-ef17-442a-969b-285458bbc799' ORDER BY created_at DESC LIMIT 20;
