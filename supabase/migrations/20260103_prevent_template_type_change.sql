-- KAIROOS 2.0 Fase 1: Migration 3
-- Trigger para impedir alteração de template_type após criação (IMUTÁVEL)

CREATE OR REPLACE FUNCTION prevent_template_type_change()
RETURNS TRIGGER AS $$
BEGIN
  -- Impedir alteração de template_type após criação
  IF (TG_OP = 'UPDATE' AND OLD.template_type IS DISTINCT FROM NEW.template_type) THEN
    RAISE EXCEPTION 'template_type cannot be changed after project creation';
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_prevent_template_type_change ON projects;
CREATE TRIGGER trg_prevent_template_type_change
  BEFORE UPDATE ON projects
  FOR EACH ROW
  EXECUTE FUNCTION prevent_template_type_change();
