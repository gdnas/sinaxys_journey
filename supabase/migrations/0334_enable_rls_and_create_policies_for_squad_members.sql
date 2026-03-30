-- Enable RLS for squad_members
ALTER TABLE squad_members ENABLE ROW LEVEL SECURITY;

-- Policies for squad_members
CREATE POLICY "squad_members_select_admin_master"
ON squad_members
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.id = auth.uid()
  AND (
    p.role = 'MASTERADMIN'
    OR (p.role = 'ADMIN' AND p.company_id = squad_members.company_id)
    OR (p.role = 'HEAD' AND p.company_id = squad_members.company_id)
  )
));

CREATE POLICY "squad_members_write_admin_master"
ON squad_members
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.id = auth.uid()
  AND (
    p.role = 'MASTERADMIN'
    OR (p.role = 'ADMIN' AND p.company_id = squad_members.company_id)
  )
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.id = auth.uid()
  AND (
    p.role = 'MASTERADMIN'
    OR (p.role = 'ADMIN' AND p.company_id = squad_members.company_id)
  )
));