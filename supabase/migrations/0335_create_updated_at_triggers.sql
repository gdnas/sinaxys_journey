-- Create updated_at function if it doesn't exist
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for cost_items
DROP TRIGGER IF EXISTS set_cost_items_updated_at ON cost_items;
CREATE TRIGGER set_cost_items_updated_at
  BEFORE UPDATE ON cost_items
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Create triggers for cost_allocations
DROP TRIGGER IF EXISTS set_cost_allocations_updated_at ON cost_allocations;
CREATE TRIGGER set_cost_allocations_updated_at
  BEFORE UPDATE ON cost_allocations
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Create triggers for squads
DROP TRIGGER IF EXISTS set_squads_updated_at ON squads;
CREATE TRIGGER set_squads_updated_at
  BEFORE UPDATE ON squads
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();

-- Create triggers for squad_members
DROP TRIGGER IF EXISTS set_squad_members_updated_at ON squad_members;
CREATE TRIGGER set_squad_members_updated_at
  BEFORE UPDATE ON squad_members
  FOR EACH ROW
  EXECUTE FUNCTION set_updated_at();