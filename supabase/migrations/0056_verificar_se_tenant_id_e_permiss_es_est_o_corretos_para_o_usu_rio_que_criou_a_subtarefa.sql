
-- Verificar se o tenant_id da subtarefa está correto
SELECT 
  wi.id,
  wi.tenant_id as work_item_tenant,
  p.tenant_id as project_tenant,
  p.id as project_id,
  prof.company_id as user_company,
  prof.id as user_id,
  prof.name as user_name,
  prof.role as user_role,
  CASE 
    WHEN wi.tenant_id = p.tenant_id THEN 'Match'
    ELSE 'Mismatch'
  END as tenant_match,
  CASE 
    WHEN p.owner_user_id = prof.id THEN 'Owner'
    WHEN EXISTS (
      SELECT 1 FROM project_members pm 
      WHERE pm.project_id = p.id AND pm.user_id = prof.id
    ) THEN 'Member'
    WHEN prof.role = 'ADMIN' AND prof.company_id = p.tenant_id THEN 'Admin'
    ELSE 'No Access'
  END as access_level
FROM work_items wi
JOIN projects p ON p.id = wi.project_id
LEFT JOIN profiles prof ON prof.id = '67acbc23-10a2-4424-b033-36e6985f7ad1'
WHERE wi.id = '00f486ab-665b-4932-a263-8d5b166d7ec4';
