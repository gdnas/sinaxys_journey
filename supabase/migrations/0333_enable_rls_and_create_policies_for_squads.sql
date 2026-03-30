-- Enable RLS for squads
ALTER TABLE squads ENABLE ROW LEVEL SECURITY;

-- Policies for squads
CREATE POLICY "squads_select_admin_master"
ON squads
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.id = auth.uid()
  AND (
    p.role = 'MASTERADMIN'
    OR (p.role = 'ADMIN' AND p.company_id = squads.company_id)
    OR (p.role = 'HEAD' AND p.company_id = squads.company_id)
  )
));

CREATE POLICY "squads_write_admin_master"
ON squads
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.id = auth.uid()
  AND (
    p.role = 'MASTERADMIN'
    OR (p.role = 'ADMIN' AND p.company_id = squads.company_id)
  )
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.id = auth.uid()
  AND (
    p.role = 'MASTERADMIN'
    OR (p.role = 'ADMIN' AND p.company_id = squads.company_id)
  )
));