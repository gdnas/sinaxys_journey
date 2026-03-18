-- Verificar qual department_id o HEAD tem e se o objective tem department_id
SELECT 
  p.id, p.email, p.role, p.department_id as user_dept,
  o.id as objective_id, o.okr_level, o.department_id as objective_dept
FROM public.profiles p
CROSS JOIN public.okr_objectives o
WHERE p.id = '50a71b9f-3f19-445b-96b2-fc4aa98b406f'
  AND o.id = '35de4adb-5037-46ed-a776-77665c7cacaf';