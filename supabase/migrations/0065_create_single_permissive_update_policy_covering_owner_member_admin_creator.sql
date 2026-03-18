-- Replace existing UPDATE policies with one consolidated permissive policy
DROP POLICY IF EXISTS work_items_update_owner ON work_items;
DROP POLICY IF EXISTS work_items_update_member ON work_items;
DROP POLICY IF EXISTS work_items_update_admin ON work_items;
DROP POLICY IF EXISTS work_items_update_creator ON work_items;
DROP POLICY IF EXISTS work_items_update_policy ON work_items;
DROP POLICY IF EXISTS work_items_update_policy_debug ON work_items;

CREATE POLICY work_items_update_permissive ON work_items
FOR UPDATE TO authenticated
USING (
  auth.uid() IS NOT NULL
  AND (
    -- creator
    created_by_user_id = auth.uid()
    -- project member
    OR EXISTS (
      SELECT 1 FROM project_members pm WHERE pm.project_id = work_items.project_id AND pm.user_id = auth.uid()
    )
    -- project owner
    OR EXISTS (
      SELECT 1 FROM projects p WHERE p.id = work_items.project_id AND p.owner_user_id = auth.uid()
    )
    -- company admin
    OR EXISTS (
      SELECT 1 FROM profiles pr WHERE pr.id = auth.uid() AND pr.role = 'ADMIN' AND pr.company_id = work_items.tenant_id
    )
  )
)
WITH CHECK (
  auth.uid() IS NOT NULL
  AND (
    created_by_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM project_members pm WHERE pm.project_id = work_items.project_id AND pm.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM projects p WHERE p.id = work_items.project_id AND p.owner_user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM profiles pr WHERE pr.id = auth.uid() AND pr.role = 'ADMIN' AND pr.company_id = work_items.tenant_id
    )
  )
);

-- Show resulting UPDATE policies
SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename='work_items' AND schemaname='public' AND cmd='UPDATE';
