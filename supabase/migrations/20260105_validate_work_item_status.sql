-- KAIROOS 2.0 Fase 1: Migration 5
-- Trigger para validar status de work_items (inclui mudança de project_id)
-- KAIROOS 2.0 Fase 1 Hardening #4: Define status default se for NULL/vazio

CREATE OR REPLACE FUNCTION validate_work_item_status_against_project()
RETURNS TRIGGER AS $$
BEGIN
  -- Se work_item está vinculado a um projeto
  IF NEW.project_id IS NOT NULL THEN
    -- Verificar se projeto tem project_workflow_status definido
    IF EXISTS (
      SELECT 1 FROM project_workflow_status 
      WHERE project_id = NEW.project_id
    ) THEN
      -- KAIROOS 2.0 Fase 1 Hardening #4: Se status for NULL ou vazio, definir default
      IF NEW.status IS NULL OR btrim(NEW.status) = '' THEN
        -- Usar o primeiro status do projeto (menor display_order)
        SELECT NEW.status := status_key
        INTO NEW.status
        FROM project_workflow_status
        WHERE project_id = NEW.project_id
        ORDER BY display_order ASC
        LIMIT 1;
        
        -- Log de debug (opcional)
        RAISE NOTICE 'Work item % assigned default status % for project %',
          NEW.id, NEW.status, NEW.project_id;
      END IF;
      
      -- Validar que status está entre os permitidos (após preenchimento do default)
      IF NEW.status IS NOT NULL AND NOT EXISTS (
        SELECT 1 FROM project_workflow_status 
        WHERE project_id = NEW.project_id 
        AND status_key = NEW.status
      ) THEN
        RAISE EXCEPTION 
          'Invalid status "%" for project. Valid statuses are: %',
          NEW.status,
          (SELECT string_agg(status_key, ', ') 
           FROM project_workflow_status 
           WHERE project_id = NEW.project_id);
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para INSERT e UPDATE (inclui mudança de project_id)
DROP TRIGGER IF EXISTS trg_validate_work_item_status_against_project ON work_items;
CREATE TRIGGER trg_validate_work_item_status_against_project
  BEFORE INSERT OR UPDATE ON work_items
  FOR EACH ROW
  EXECUTE FUNCTION validate_work_item_status_against_project();