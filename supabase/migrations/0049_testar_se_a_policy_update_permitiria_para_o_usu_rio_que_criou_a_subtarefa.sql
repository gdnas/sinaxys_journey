
-- Testar se a policy UPDATE permitiria para o owner
SELECT 
  EXISTS (
    SELECT 1
    FROM projects
    WHERE (
      projects.id = '78d61014-4869-45f4-a777-87cc2d1ef9b7' 
      AND projects.tenant_id = '15de0336-fa2e-4a8d-b4d6-d783ca295b65' 
      AND (
        projects.owner_user_id = '67acbc23-10a2-4424-b033-36e6985f7ad1'
        OR EXISTS (
          SELECT 1
          FROM project_members
          WHERE (
            project_members.project_id = projects.id
            AND project_members.user_id = '67acbc23-10a2-4424-b033-36e6985f7ad1'
          )
        )
        OR EXISTS (
          SELECT 1
          FROM profiles p
          WHERE (
            p.id = '67acbc23-10a2-4424-b033-36e6985f7ad1' 
            AND p.role = 'ADMIN'
            AND p.company_id = projects.tenant_id
          )
        )
      )
    )
  ) AS can_update;
