-- Recreate log_work_item_event to avoid inserting events that reference deleted work_item ids.
-- For DELETE: only insert parent-level 'subtask_deleted' events (work_item_id = OLD.parent_id) when parent exists.
CREATE OR REPLACE FUNCTION public.log_work_item_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  actor uuid;
BEGIN
    -- Try to get auth.uid(), if not available keep null
    BEGIN
      actor := auth.uid();
    EXCEPTION WHEN OTHERS THEN
      actor := NULL;
    END;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.work_item_events (
            work_item_id,
            user_id,
            event_type,
            new_value,
            metadata
        ) VALUES (
            NEW.id,
            COALESCE(actor, NEW.created_by_user_id),
            'created',
            NEW.title,
            jsonb_build_object('title', NEW.title, 'status', NEW.status)
        );

        IF NEW.parent_id IS NOT NULL THEN
            INSERT INTO public.work_item_events (
                work_item_id,
                user_id,
                event_type,
                new_value,
                metadata
            ) VALUES (
                NEW.parent_id,
                COALESCE(actor, NEW.created_by_user_id),
                'subtask_created',
                NEW.title,
                jsonb_build_object('subtask_id', NEW.id, 'subtask_title', NEW.title)
            );
        END IF;

        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            INSERT INTO public.work_item_events (
                work_item_id,
                user_id,
                event_type,
                old_value,
                new_value,
                metadata
            ) VALUES (
                NEW.id,
                COALESCE(actor, NEW.created_by_user_id),
                'status_changed',
                OLD.status,
                NEW.status,
                jsonb_build_object('title', NEW.title)
            );
        END IF;

        IF OLD.status != 'done' AND NEW.status = 'done' AND NEW.parent_id IS NOT NULL THEN
            INSERT INTO public.work_item_events (
                work_item_id,
                user_id,
                event_type,
                new_value,
                metadata
            ) VALUES (
                NEW.parent_id,
                COALESCE(actor, NEW.created_by_user_id),
                'subtask_completed',
                NEW.title,
                jsonb_build_object('subtask_id', NEW.id, 'subtask_title', NEW.title)
            );
        END IF;

        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        -- Instead of inserting an event that references the soon-to-be-deleted item (OLD.id),
        -- we only insert a parent-level event referencing OLD.parent_id (if present).
        IF OLD.parent_id IS NOT NULL THEN
            INSERT INTO public.work_item_events (
                work_item_id,
                user_id,
                event_type,
                metadata
            ) VALUES (
                OLD.parent_id,
                COALESCE(actor, OLD.created_by_user_id),
                'subtask_deleted',
                jsonb_build_object('subtask_id', OLD.id, 'subtask_title', OLD.title)
            );
        END IF;

        -- Do NOT insert an event referencing OLD.id (the deleted row) because it won't exist after deletion.
        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$function$;

-- Ensure BEFORE DELETE trigger exists
DROP TRIGGER IF EXISTS trigger_log_work_item_events_before_delete ON public.work_items;
CREATE TRIGGER trigger_log_work_item_events_before_delete
BEFORE DELETE ON public.work_items
FOR EACH ROW EXECUTE FUNCTION public.log_work_item_event();

-- Ensure AFTER INSERT/UPDATE trigger exists
DROP TRIGGER IF EXISTS trigger_log_work_item_events_after ON public.work_items;
CREATE TRIGGER trigger_log_work_item_events_after
AFTER INSERT OR UPDATE ON public.work_items
FOR EACH ROW EXECUTE FUNCTION public.log_work_item_event();
