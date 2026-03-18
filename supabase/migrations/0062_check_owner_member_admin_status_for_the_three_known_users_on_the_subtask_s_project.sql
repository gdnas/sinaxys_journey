-- Check if specific users would pass the update policy for the subtask
WITH vars AS (SELECT '00f486ab-665b-4932-a263-8d5b166d7ec4'::uuid as wi_id, '78d61014-4869-45f4-a777-87cc2d1ef9b7'::uuid as proj_id, '15de0336-fa2e-4a8d-b4d6-d783ca295b65'::uuid as tenant_id)
SELECT
  u.id,
  u.name,
  -- owner?
  (SELECT p.owner_user_id = u.id FROM projects p WHERE p.id = vars.proj_id) AS is_owner,
  -- member?
  EXISTS (SELECT 1 FROM project_members pm WHERE pm.project_id = vars.proj_id AND pm.user_id = u.id) AS is_member,
  -- admin?
  (u.role = 'ADMIN' AND u.company_id = vars.tenant_id) AS is_company_admin
FROM vars, (VALUES
  ('67acbc23-10a2-4424-b033-36e6985f7ad1'::uuid),
  ('3d0e689b-c40d-4984-b6b0-0c62e5662da5'::uuid),
  ('03fab64f-f68b-4d4f-bdd3-7ea534ed1d53'::uuid)
) AS v(id)
JOIN profiles u on u.id = v.id;
