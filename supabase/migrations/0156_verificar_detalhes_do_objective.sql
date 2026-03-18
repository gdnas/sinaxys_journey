-- Verificar o okr_level e department do objective
SELECT 
  o.id, 
  o.title, 
  o.okr_level, 
  o.department_id, 
  o.owner_user_id,
  o.level
FROM public.okr_objectives o
WHERE o.id = '35de4adb-5037-46ed-a776-77665c7cacaf';