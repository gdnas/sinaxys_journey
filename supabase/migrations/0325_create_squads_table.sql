-- Create squads table
CREATE TABLE squads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name text NOT NULL,
  product text,
  type text CHECK (type IN ('core', 'growth', 'support')),
  owner_user_id uuid REFERENCES profiles(id) ON DELETE SET NULL,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);