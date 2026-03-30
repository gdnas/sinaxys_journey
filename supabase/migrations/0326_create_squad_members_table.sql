-- Create squad_members table
CREATE TABLE squad_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  squad_id uuid NOT NULL REFERENCES squads(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  allocation_percentage numeric NOT NULL CHECK (allocation_percentage > 0 AND allocation_percentage <= 100),
  role text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(squad_id, user_id)
);