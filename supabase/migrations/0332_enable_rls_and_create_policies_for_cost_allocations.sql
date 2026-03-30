-- Enable RLS for cost_allocations
ALTER TABLE cost_allocations ENABLE ROW LEVEL SECURITY;

-- Policies for cost_allocations
CREATE POLICY "cost_allocations_select_admin_master"
ON cost_allocations
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.id = auth.uid()
  AND (
    p.role = 'MASTERADMIN'
    OR (p.role = 'ADMIN' AND p.company_id = cost_allocations.company_id)
  )
));

CREATE POLICY "cost_allocations_write_admin_master"
ON cost_allocations
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.id = auth.uid()
  AND (
    p.role = 'MASTERADMIN'
    OR (p.role = 'ADMIN' AND p.company_id = cost_allocations.company_id)
  )
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.id = auth.uid()
  AND (
    p.role = 'MASTERADMIN'
    OR (p.role = 'ADMIN' AND p.company_id = cost_allocations.company_id)
  )
));