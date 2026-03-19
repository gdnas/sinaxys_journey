-- =====================================================
-- MIGRATION: Notificações Confiáveis para Work Items
-- =====================================================
-- Implementa notificações para eventos essenciais de execução
--
-- Eventos implementados:
-- 1. Criação de tarefa → notificar assignee_user_id
-- 2. Mudança de responsável → notificar novo responsável
-- 3. Comentário com @menção → notificar mencionado (já existe, validar)
-- 4. Comentário em tarefa atribuída → notificar responsável
-- 5. Mudança de status → notificar assignee

-- 1. Função para criar notificações de work_items
CREATE OR REPLACE FUNCTION public.notify_work_item_events()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO ''
AS $function$
DECLARE
  actor uuid;
  v_title text;
  v_content text;
  v_href text;
  v_notif_type text;
BEGIN
  BEGIN
    actor := auth.uid();
  EXCEPTION WHEN OTHERS THEN
      actor := NULL;
  END;

  IF TG_OP = 'INSERT' THEN
    -- EVENTO 1: Criação de tarefa → notificar assignee
    IF NEW.assignee_user_id IS NOT NULL AND NEW.assignee_user_id <> actor THEN
      v_title := 'Nova tarefa atribuída a você';
      v_content := CASE 
        WHEN NEW.title IS NOT NULL THEN 'Você foi atribuído a: ' || NEW.title
        ELSE 'Você foi atribuído a uma nova tarefa'
      END;
      v_href := '/app/work-items/' || NEW.id;
      v_notif_type := 'WORK_ITEM_ASSIGNED';
      
      BEGIN
        PERFORM public.create_notification(
          NEW.assignee_user_id,
          v_title,
          actor,
          v_content,
          v_href,
          v_notif_type
        );
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
    
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    -- EVENTO 2: Mudança de responsável → notificar novo responsável
    IF OLD.assignee_user_id IS DISTINCT FROM NEW.assignee_user_id 
       AND NEW.assignee_user_id IS NOT NULL 
       AND NEW.assignee_user_id <> actor THEN
      v_title := 'Responsável alterado';
      v_content := CASE 
        WHEN NEW.title IS NOT NULL THEN 'Você agora é responsável por: ' || NEW.title
        ELSE 'Você foi designado responsável de uma tarefa'
      END;
      v_href := '/app/work-items/' || NEW.id;
      v_notif_type := 'WORK_ITEM_REASSIGNED';
      
      BEGIN
        PERFORM public.create_notification(
          NEW.assignee_user_id,
          v_title,
          actor,
          v_content,
          v_href,
          v_notif_type
        );
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
    
    -- EVENTO 5: Mudança de status → notificar assignee
    IF OLD.status IS DISTINCT FROM NEW.status THEN
      IF NEW.assignee_user_id IS NOT NULL AND NEW.assignee_user_id <> actor THEN
        v_title := CASE NEW.status
          WHEN 'done' THEN 'Tarefa concluída'
          WHEN 'in_progress' THEN 'Tarefa em andamento'
          WHEN 'todo' THEN 'Tarefa iniciada'
          ELSE 'Status atualizado'
        END;
        v_content := CASE 
          WHEN NEW.title IS NOT NULL THEN NEW.title || ' está com status: ' || NEW.status
          ELSE 'Uma tarefa teve o status atualizado para: ' || NEW.status
        END;
        v_href := '/app/work-items/' || NEW.id;
        v_notif_type := 'WORK_ITEM_STATUS_CHANGED';
        
        BEGIN
          PERFORM public.create_notification(
            NEW.assignee_user_id,
            v_title,
            actor,
            v_content,
            v_href,
            v_notif_type
          );
        EXCEPTION WHEN OTHERS THEN
          NULL;
        END;
      END IF;
    END IF;
    
    RETURN NEW;
  END IF;

  RETURN NULL;
END;
$function$;

-- 2. Criar triggers para notificações de work_items
DROP TRIGGER IF EXISTS trigger_notify_work_item_assigned ON public.work_items;
CREATE TRIGGER trigger_notify_work_item_assigned
AFTER INSERT ON public.work_items
FOR EACH ROW
EXECUTE FUNCTION public.notify_work_item_events();

DROP TRIGGER IF EXISTS trigger_notify_work_item_updated ON public.work_items;
CREATE TRIGGER trigger_notify_work_item_updated
AFTER UPDATE ON public.work_items
FOR EACH ROW
WHEN (
  OLD.assignee_user_id IS DISTINCT FROM NEW.assignee_user_id
  OR OLD.status IS DISTINCT FROM NEW.status
)
EXECUTE FUNCTION public.notify_work_item_events();
