-- CORREÇÃO PREVENTIVA: Melhorar o trigger log_work_item_event para evitar falhas
-- Esta mudança adiciona tratamento de erro explícito para garantir que
-- o trigger nunca cause uma falha de insert em work_items

CREATE OR REPLACE FUNCTION public.log_work_item_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  actor uuid;
  v_parent_work_item_exists boolean;
BEGIN
    -- Try to get auth.uid(), if not available keep null
    BEGIN
      actor := auth.uid();
    EXCEPTION WHEN OTHERS THEN
      actor := NULL;
    END;

    IF TG_OP = 'INSERT' THEN
        -- Inserir evento de created
        BEGIN
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
        EXCEPTION WHEN OTHERS THEN
            -- Se falhar, não propagar o erro para não quebrar o insert principal
            NULL;
        END;

        -- Inserir evento de subtask_created se tiver parent_id
        IF NEW.parent_id IS NOT NULL THEN
            BEGIN
                -- Verificar se o parent existe antes de tentar inserir
                SELECT EXISTS(SELECT 1 FROM public.work_items WHERE id = NEW.parent_id)
                INTO v_parent_work_item_exists;
                
                IF v_parent_work_item_exists THEN
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
            EXCEPTION WHEN OTHERS THEN
                -- Se falhar, não propagar o erro
                NULL;
            END;
        END IF;

        RETURN NEW;
    END IF;

    IF TG_OP = 'UPDATE' THEN
        IF OLD.status IS DISTINCT FROM NEW.status THEN
            BEGIN
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
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END IF;

        IF OLD.status != 'done' AND NEW.status = 'done' AND NEW.parent_id IS NOT NULL THEN
            BEGIN
                SELECT EXISTS(SELECT 1 FROM public.work_items WHERE id = NEW.parent_id)
                INTO v_parent_work_item_exists;
                
                IF v_parent_work_item_exists THEN
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
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END IF;

        RETURN NEW;
    END IF;

    IF TG_OP = 'DELETE' THEN
        IF OLD.parent_id IS NOT NULL THEN
            BEGIN
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
            EXCEPTION WHEN OTHERS THEN
                NULL;
            END;
        END IF;

        RETURN OLD;
    END IF;

    RETURN NULL;
END;
$function$;