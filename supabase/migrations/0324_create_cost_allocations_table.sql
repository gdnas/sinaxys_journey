-- Create cost_allocations table
CREATE TABLE cost_allocations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  cost_item_id uuid NOT NULL REFERENCES cost_items(id) ON DELETE CASCADE,
  department_id uuid NOT NULL REFERENCES departments(id) ON DELETE CASCADE,
  allocation_percentage numeric NOT NULL CHECK (allocation_percentage > 0 AND allocation_percentage <= 100),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(cost_item_id, department_id)
);