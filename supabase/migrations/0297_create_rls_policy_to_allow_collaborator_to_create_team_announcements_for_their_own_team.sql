-- Create policy to allow COLLABORATOR to create team-scoped announcements for their own team only
CREATE POLICY "announcements_insert_collaborator" ON public.company_announcements
FOR INSERT TO authenticated
WITH CHECK (
  scope = 'team' AND
  team_id = (SELECT department_id FROM profiles WHERE id = auth.uid()) AND
  is_member_of_company(company_id)
);
