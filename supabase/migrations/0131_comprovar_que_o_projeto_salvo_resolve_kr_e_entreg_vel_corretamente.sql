select p.id, p.name, o.title as okr_title, o.okr_level, kr.title as key_result_title, d.title as deliverable_title
from public.projects p
left join public.okr_key_results kr on kr.id = p.key_result_id
left join public.okr_objectives o on o.id = kr.objective_id
left join public.okr_deliverables d on d.id = p.deliverable_id
where p.id = '54bd451c-5ade-4932-aec3-16edc3720b04';