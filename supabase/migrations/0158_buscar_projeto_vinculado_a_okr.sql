-- Buscar projeto com key_result_id e deliverable_id
SELECT 
  p.id, 
  p.name, 
  p.tenant_id,
  p.key_result_id,
  p.deliverable_id,
  p.owner_user_id
FROM public.projects p
WHERE p.key_result_id IS NOT NULL 
  OR p.deliverable_id IS NOT NULL
LIMIT 1;