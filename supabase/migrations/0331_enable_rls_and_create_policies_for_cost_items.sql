-- Enable RLS for cost_items
ALTER TABLE cost_items ENABLE ROW LEVEL SECURITY;

-- Policies for cost_items
CREATE POLICY "cost_items_select_admin_master"
ON cost_items
FOR SELECT
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.id = auth.uid()
  AND (
    p.role = 'MASTERADMIN'
    OR (p.role = 'ADMIN' AND p.company_id = cost_items.company_id)
  )
));

CREATE POLICY "cost_items_write_admin_master"
ON cost_items
FOR ALL
TO authenticated
USING (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.id = auth.uid()
  AND (
    p.role = 'MASTERADMIN'
    OR (p.role = 'ADMIN' AND p.company_id = cost_items.company_id)
  )
))
WITH CHECK (EXISTS (
  SELECT 1 FROM profiles p
  WHERE p.id = auth.uid()
  AND (
    p.role = 'MASTERADMIN'
    OR (p.role = 'ADMIN' AND p.company_id = cost_items.company_id)
  )
));