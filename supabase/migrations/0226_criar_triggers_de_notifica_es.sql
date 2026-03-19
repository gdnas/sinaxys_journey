
-- 2. Criar triggers para notificações de work_items

-- Trigger AFTER INSERT para notificar assignee
DROP TRIGGER IF EXISTS trigger_notify_work_item_assigned ON public.work_items;
CREATE TRIGGER trigger_notify_work_item_assigned
AFTER INSERT ON public.work_items
FOR EACH ROW
EXECUTE FUNCTION public.notify_work_item_events();

-- Trigger AFTER UPDATE para notificar reassign e status change
DROP TRIGGER IF EXISTS trigger_notify_work_item_updated ON public.work_items;
CREATE TRIGGER trigger_notify_work_item_updated
AFTER UPDATE ON public.work_items
FOR EACH ROW
WHEN (
  OLD.assignee_user_id IS DISTINCT FROM NEW.assignee_user_id
  OR OLD.status IS DISTINCT FROM NEW.status
)
EXECUTE FUNCTION public.notify_work_item_events();
