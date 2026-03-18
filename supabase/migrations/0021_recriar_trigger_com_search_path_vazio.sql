-- Verificar se o trigger está causando problema
-- Recriar trigger de forma mais simples
CREATE OR REPLACE FUNCTION public.log_work_item_event()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
    -- Evento de criação
    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.work_item_events (
            work_item_id, 
            user_id, 
            event_type, 
            new_value, 
            metadata
        ) VALUES (
            NEW.id, 
            NEW.created_by_user_id, 
            'created', 
            NEW.title, 
            jsonb_build_object('title', NEW.title, 'status', NEW.status)
        );
        
        -- Evento de criação de subtarefa (se aplicável)
        IF NEW.parent_id IS NOT NULL THEN
            INSERT INTO public.work_item_events (
                work_item_id, 
                user_id, 
                event_type, 
                new_value, 
                metadata
            ) VALUES (
                NEW.parent_id, 
                NEW.created_by_user_id, 
                'subtask_created', 
                NEW.title, 
                jsonb_build_object('subtask_id', NEW.id, 'subtask_title', NEW.title)
            );
        END IF;
        
        RETURN NEW;
    END IF;

    -- Evento de mudança de status
    IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
        INSERT INTO public.work_item_events (
            work_item_id, 
            user_id, 
            event_type, 
            old_value, 
            new_value, 
            metadata
        ) VALUES (
            NEW.id, 
            auth.uid(), 
            'status_changed', 
            OLD.status, 
            NEW.status, 
            jsonb_build_object('title', NEW.title)
        );
    END IF;

    -- Evento de conclusão de subtarefa
    IF TG_OP = 'UPDATE' AND OLD.status != 'done' AND NEW.status = 'done' AND NEW.parent_id IS NOT NULL THEN
        INSERT INTO public.work_item_events (
            work_item_id, 
            user_id, 
            event_type, 
            new_value, 
            metadata
        ) VALUES (
            NEW.parent_id, 
            auth.uid(), 
            'subtask_completed', 
            NEW.title, 
            jsonb_build_object('subtask_id', NEW.id, 'subtask_title', NEW.title)
        );
    END IF;

    RETURN NEW;
END;
$$;

-- Recriar trigger
CREATE TRIGGER trigger_log_work_item_events
    AFTER INSERT OR UPDATE ON public.work_items
    FOR EACH ROW
    EXECUTE FUNCTION public.log_work_item_event();