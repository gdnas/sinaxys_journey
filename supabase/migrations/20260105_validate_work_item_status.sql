-- KAIROOS 2.0 Fase 1: Migration 5
-- Trigger para validar status de work_items (inclui mudança de project_id)

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
      -- Se sim, validar que status está entre os permitidos
      IF NOT EXISTS (
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
