
-- Criar policy UPDATE alternativa para debugging
DROP POLICY IF EXISTS "work_items_update_policy_debug" ON work_items;

CREATE POLICY "work_items_update_policy_debug" ON work_items
FOR UPDATE TO authenticated
USING (
  project_id IN (
    SELECT id FROM projects 
    WHERE owner_user_id = auth.uid()
    OR id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = auth.uid()
    )
  )
)
WITH CHECK (
  project_id IN (
    SELECT id FROM projects 
    WHERE owner_user_id = auth.uid()
    OR id IN (
      SELECT project_id FROM project_members 
      WHERE user_id = auth.uid()
    )
  )
);
