-- 1) Update events_insert_policy to base tenant check on the inserted row's user_id (so trigger inserts with user_id pass)
DROP POLICY IF EXISTS events_insert_policy ON work_item_events;
CREATE POLICY events_insert_policy ON work_item_events
FOR INSERT TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1
    FROM work_items wi
    WHERE wi.id = work_item_events.work_item_id
      AND wi.tenant_id IN (
        SELECT profiles.company_id FROM profiles WHERE profiles.id = work_item_events.user_id
      )
  )
);

-- Keep select policy as-is (reads depend on auth.uid()) but ensure it exists
DROP POLICY IF EXISTS events_select_policy ON work_item_events;
CREATE POLICY events_select_policy ON work_item_events
FOR SELECT TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM work_items wi
    WHERE wi.id = work_item_events.work_item_id
      AND wi.tenant_id IN (
        SELECT profiles.company_id FROM profiles WHERE profiles.id = auth.uid()
      )
  )
);

-- 2) Modify log_work_item_event function to also handle DELETE events and ensure it inserts with explicit user_id (auth.uid() when available, else OLD.created_by_user_id)
CREATE OR REPLACE FUNCTION public.log_work_item_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  actor uuid;
BEGIN
    -- Determine actor: prefer auth.uid(), fallback to NEW.created_by_user_id or OLD.created_by_user_id
    actor := NULL;
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
        -- Log deletion of the item itself
        INSERT INTO public.work_item_events (
            work_item_id,
            user_id,
            event_type,
            old_value,
            metadata
        ) VALUES (
            OLD.id,
            COALESCE(actor, OLD.created_by_user_id),
            'deleted',
            OLD.title,
            jsonb_build_object('title', OLD.title, 'status', OLD.status)
        );

        -- If it was a subtask, also log on the parent
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

        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$function$;

-- 3) Ensure triggers exist for INSERT, UPDATE, DELETE
DROP TRIGGER IF EXISTS trigger_log_work_item_events ON work_items;
CREATE TRIGGER trigger_log_work_item_events
AFTER INSERT OR UPDATE OR DELETE ON public.work_items
FOR EACH ROW EXECUTE FUNCTION public.log_work_item_event();

-- 4) Show recent events for an example work_item to validate
SELECT * FROM work_item_events WHERE work_item_id IN (
  SELECT id FROM work_items WHERE parent_id = '748ffad4-ef17-442a-969b-285458bbc799' LIMIT 1
) ORDER BY created_at DESC LIMIT 20;
