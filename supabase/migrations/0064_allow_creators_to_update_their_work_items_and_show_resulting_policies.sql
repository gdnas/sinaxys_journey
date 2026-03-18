-- Add policy to allow the creator of a work_item to update it
DROP POLICY IF EXISTS work_items_update_creator ON work_items;

CREATE POLICY work_items_update_creator ON work_items
FOR UPDATE TO authenticated
USING (
  created_by_user_id = auth.uid()
)
WITH CHECK (
  created_by_user_id = auth.uid()
);

-- Show all UPDATE policies after change
SELECT policyname, cmd, qual, with_check FROM pg_policies WHERE tablename='work_items' AND schemaname='public' AND cmd='UPDATE';
