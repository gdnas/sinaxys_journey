-- Teste 1: Buscar tarefas de um KR específico (sem projeto)
select 
  wi.id,
  wi.title,
  wi.status,
  wi.project_id,
  wi.key_result_id,
  wi.deliverable_id
from work_items wi
where wi.key_result_id = '138f80e1-bbb6-493d-8939-90a92ec44fb8'
limit 5;

-- Teste 2: Buscar tarefas de um entregável específico
select 
  wi.id,
  wi.title,
  wi.status,
  wi.project_id,
  wi.key_result_id,
  d.title as deliverable_title
from work_items wi
left join okr_deliverables d on wi.deliverable_id = d.id
where d.key_result_id = 'adbf124b-d699-4cfa-8853-c7829f604a06'
limit 5;