-- Create cost_items table
CREATE TABLE cost_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  category text,
  type text NOT NULL CHECK (type IN ('fixed', 'variable')),
  billing_cycle text NOT NULL DEFAULT 'monthly' CHECK (billing_cycle IN ('monthly', 'annual', 'one_time')),
  total_monthly_cost numeric NOT NULL CHECK (total_monthly_cost >= 0),
  is_shared boolean DEFAULT false,
  allocation_method text NOT NULL DEFAULT 'manual' CHECK (allocation_method IN ('manual', 'headcount')),
  owner_department_id uuid REFERENCES departments(id) ON DELETE SET NULL,
  competence_month integer CHECK (competence_month BETWEEN 1 AND 12),
  competence_year integer CHECK (competence_year >= 2000 AND competence_year <= 2100),
  active boolean DEFAULT true,
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);