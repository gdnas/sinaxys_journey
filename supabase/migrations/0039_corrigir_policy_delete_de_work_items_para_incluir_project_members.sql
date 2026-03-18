
-- Dropar a policy DELETE antiga que não inclui project_members
DROP POLICY IF EXISTS "work_items_delete_policy" ON work_items;

-- Criar nova policy DELETE que inclui project_members
CREATE POLICY "work_items_delete_policy" ON work_items
FOR DELETE TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM projects
    WHERE (
      projects.id = work_items.project_id
      AND projects.tenant_id = work_items.tenant_id
      AND (
        -- Owner do projeto
        projects.owner_user_id = auth.uid()
        -- OU membro do projeto
        OR EXISTS (
          SELECT 1
          FROM project_members
          WHERE (
            project_members.project_id = projects.id
            AND project_members.user_id = auth.uid()
          )
        )
        -- OU admin da empresa
        OR EXISTS (
          SELECT 1
          FROM profiles p
          WHERE (
            p.id = auth.uid()
            AND p.role = 'ADMIN'
            AND p.company_id = projects.tenant_id
          )
        )
      )
    )
  )
);
