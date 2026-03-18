-- Simular o que a policy can_create_work_item faz
BEGIN;

-- Usar uma query que simula a verificação da policy
SELECT 
  auth.uid() as current_user,
  d.key_result_id,
  o.company_id as objective_company,
  o.okr_level,
  o.department_id as objective_department,
  o.owner_user_id as objective_owner
FROM public.okr_deliverables d
JOIN public.okr_key_results kr ON kr.id = d.key_result_id
JOIN public.okr_objectives o ON o.id = kr.objective_id
WHERE d.id = '78b90c9e-db73-4a63-a52c-0937e37ddb98';

ROLLBACK;