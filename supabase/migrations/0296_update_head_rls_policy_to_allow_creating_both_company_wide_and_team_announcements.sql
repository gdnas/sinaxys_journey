-- Drop existing head insert policy to recreate with both capabilities
DROP POLICY IF EXISTS "announcements_insert_head" ON public.company_announcements;

-- Create comprehensive policy for HEAD: can create for company OR their own team
-- For company scope: HEAD can create if they are head of any department in the company
-- For team scope: HEAD can create only for their own team
CREATE POLICY "announcements_insert_head" ON public.company_announcements
FOR INSERT TO authenticated
WITH CHECK (
  is_member_of_company(company_id) AND
  (
    (scope = 'company' AND EXISTS (
      SELECT 1 FROM profiles 
      WHERE id = auth.uid() 
      AND department_id IS NOT NULL
      AND company_id = (SELECT company_id FROM company_announcements WHERE id = company_id)
    )) OR
    (scope = 'team' AND is_head_of_department(team_id))
  )
);
