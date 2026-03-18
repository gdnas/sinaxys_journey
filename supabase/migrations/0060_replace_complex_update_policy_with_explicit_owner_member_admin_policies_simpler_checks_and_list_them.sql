-- Backup: show existing update policies
SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename='work_items' AND schemaname='public' AND cmd='UPDATE';

-- Drop existing update policies
DROP POLICY IF EXISTS "work_items_update_policy" ON work_items;
DROP POLICY IF EXISTS "work_items_update_policy_debug" ON work_items;

-- Create owner policy
CREATE POLICY "work_items_update_owner" ON work_items
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM projects p WHERE p.id = work_items.project_id AND p.owner_user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects p WHERE p.id = work_items.project_id AND p.owner_user_id = auth.uid()
  )
);

-- Create member policy
CREATE POLICY "work_items_update_member" ON work_items
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM project_members pm WHERE pm.project_id = work_items.project_id AND pm.user_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM project_members pm WHERE pm.project_id = work_items.project_id AND pm.user_id = auth.uid()
  )
);

-- Create admin policy (company admin)
CREATE POLICY "work_items_update_admin" ON work_items
FOR UPDATE TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles pr WHERE pr.id = auth.uid() AND pr.role = 'ADMIN' AND pr.company_id = work_items.tenant_id
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles pr WHERE pr.id = auth.uid() AND pr.role = 'ADMIN' AND pr.company_id = work_items.tenant_id
  )
);

-- Show new policies
SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename='work_items' AND schemaname='public' AND cmd='UPDATE';
