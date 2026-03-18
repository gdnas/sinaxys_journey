
-- Verificar dados completos da subtarefa
SELECT 
  wi.id,
  wi.project_id,
  wi.tenant_id,
  wi.parent_id,
  wi.created_by_user_id,
  wi.status,
  wi.title,
  p.id as parent_id_check,
  p.project_id as parent_project_id,
  p.tenant_id as parent_tenant_id,
  proj.id as project_id_check,
  proj.tenant_id as project_tenant_id,
  proj.owner_user_id
FROM work_items wi
LEFT JOIN work_items p ON p.id = wi.parent_id
LEFT JOIN projects proj ON proj.id = wi.project_id
WHERE wi.id = '00f486ab-665b-4932-a263-8d5b166d7ec4';
