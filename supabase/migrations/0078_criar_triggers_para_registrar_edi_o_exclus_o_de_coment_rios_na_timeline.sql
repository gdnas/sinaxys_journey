-- Criar função para registrar eventos de comentários
CREATE OR REPLACE FUNCTION public.log_comment_event()
RETURNS TRIGGER
LANGUAGE PLPGSQL
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  -- Evento de edição de comentário
  IF TG_OP = 'UPDATE' AND OLD.content IS DISTINCT FROM NEW.content THEN
    INSERT INTO public.work_item_events (
      work_item_id,
      user_id,
      event_type,
      old_value,
      new_value,
      metadata
    ) VALUES (
      NEW.work_item_id,
      auth.uid(),
      'comment_edited',
      OLD.content,
      NEW.content,
      jsonb_build_object('comment_id', NEW.id)
    );
    RETURN NEW;
  END IF;

  -- Evento de exclusão de comentário
  IF TG_OP = 'DELETE' THEN
    INSERT INTO public.work_item_events (
      work_item_id,
      user_id,
      event_type,
      old_value,
      metadata
    ) VALUES (
      OLD.work_item_id,
      auth.uid(),
      'comment_deleted',
      OLD.content,
      jsonb_build_object('comment_id', OLD.id)
    );
    RETURN OLD;
  END IF;

  RETURN NEW;
END;
$$;

-- Criar triggers para executar a função
DROP TRIGGER IF EXISTS trigger_log_comment_events ON public.work_item_comments;

CREATE TRIGGER trigger_log_comment_events
  AFTER UPDATE OR DELETE ON public.work_item_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.log_comment_event();

-- Verificar triggers criados
SELECT 
  trigger_name,
  event_manipulation,
  event_object_table,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'work_item_comments';