-- Atualizar políticas de UPDATE e DELETE para work_item_comments
-- Permitir que ADMINs editem/excluam comentários de qualquer usuário

-- Remover políticas antigas
DROP POLICY IF EXISTS "comments_update_policy" ON work_item_comments;
DROP POLICY IF EXISTS "comments_delete_policy" ON work_item_comments;

-- Criar nova política UPDATE: permite dono ou admin da empresa
CREATE POLICY "comments_update_policy" ON work_item_comments
FOR UPDATE TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM work_items wi
    WHERE wi.id = work_item_comments.work_item_id
    AND wi.tenant_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'
    )
  )
);

-- Criar nova política DELETE: permite dono ou admin da empresa
CREATE POLICY "comments_delete_policy" ON work_item_comments
FOR DELETE TO authenticated
USING (
  user_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM work_items wi
    WHERE wi.id = work_item_comments.work_item_id
    AND wi.tenant_id IN (
      SELECT company_id FROM profiles WHERE id = auth.uid() AND role = 'ADMIN'
    )
  )
);

-- Verificar políticas criadas
SELECT 
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'work_item_comments'
ORDER BY policyname;