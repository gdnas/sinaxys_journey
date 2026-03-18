
-- Criar função para testar se o usuário pode atualizar
CREATE OR REPLACE FUNCTION test_update_permission(p_work_item_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  can_update boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1
    FROM work_items wi
    JOIN projects p ON p.id = wi.project_id
    WHERE 
      wi.id = p_work_item_id
      AND (
        p.owner_user_id = auth.uid()
        OR EXISTS (
          SELECT 1 FROM project_members pm
          WHERE pm.project_id = p.id AND pm.user_id = auth.uid()
        )
        OR EXISTS (
          SELECT 1 FROM profiles pr
          WHERE pr.id = auth.uid() AND pr.role = 'ADMIN' AND pr.company_id = p.tenant_id
        )
      )
  ) INTO can_update;
  
  RETURN can_update;
END;
$$;
