-- Create policy to allow users to delete their own announcements (soft delete via update)
CREATE POLICY "announcements_delete_author" ON public.company_announcements
FOR UPDATE TO authenticated
USING (
  created_by = auth.uid()
)
WITH CHECK (
  created_by = auth.uid() AND
  status = 'archived'
);
