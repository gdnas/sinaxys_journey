-- Drop policy antiga
DROP POLICY IF EXISTS "work_items_update_policy" ON public.work_items;

-- Criar nova policy UPDATE permitindo project_members
CREATE POLICY "work_items_update_policy" ON public.work_items
FOR UPDATE TO public
USING (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = work_items.project_id
      AND projects.tenant_id = work_items.tenant_id
      AND (
        projects.owner_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
            AND project_members.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'ADMIN'
            AND p.company_id = projects.tenant_id
        )
      )
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM projects
    WHERE projects.id = work_items.project_id
      AND projects.tenant_id = work_items.tenant_id
      AND (
        projects.owner_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM project_members
          WHERE project_members.project_id = projects.id
            AND project_members.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM profiles p
          WHERE p.id = auth.uid()
            AND p.role = 'ADMIN'
            AND p.company_id = projects.tenant_id
        )
      )
  )
);