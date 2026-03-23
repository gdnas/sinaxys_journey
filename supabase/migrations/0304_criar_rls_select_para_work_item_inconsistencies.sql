CREATE POLICY work_item_inconsistencies_select_policy
ON work_item_inconsistencies
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects p
    JOIN project_members pm ON pm.project_id = p.id
    WHERE p.id = work_item_inconsistencies.project_id
      AND pm.user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM projects p
    WHERE p.id = work_item_inconsistencies.project_id
      AND p.owner_user_id = auth.uid()
  )
  OR EXISTS (
    SELECT 1 FROM profiles pr
    WHERE pr.id = auth.uid() AND pr.role IN ('ADMIN', 'MASTERADMIN')
    )
);