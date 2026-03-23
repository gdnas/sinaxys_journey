-- RLS DELETE: Apenas Admin pode deletar inconsistências

CREATE POLICY work_item_inconsistencies_delete_policy
ON work_item_inconsistencies
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM profiles pr
    WHERE pr.id = auth.uid() AND pr.role = 'ADMIN'
  )
);