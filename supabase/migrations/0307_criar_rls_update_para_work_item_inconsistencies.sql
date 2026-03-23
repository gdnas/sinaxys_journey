-- RLS UPDATE: Apenas Admin pode atualizar

CREATE POLICY work_item_inconsistencies_update_policy
ON work_item_inconsistencies
FOR UPDATE
TO authenticated
USING (
  -- Admin/MasterAdmin pode atualizar
  EXISTS (
    SELECT 1 FROM profiles pr
    WHERE pr.id = auth.uid() AND pr.role IN ('ADMIN', 'MASTERADMIN')
  )
);