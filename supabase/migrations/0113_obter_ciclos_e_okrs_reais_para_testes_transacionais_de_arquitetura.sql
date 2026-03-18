select c.id as cycle_id, c.type, c.year, c.quarter from public.okr_cycles c where c.company_id = '15de0336-fa2e-4a8d-b4d6-d783ca295b65' order by c.year desc, c.quarter desc nulls last limit 5;

select id, title, okr_level, department_id from public.okr_objectives where company_id = '15de0336-fa2e-4a8d-b4d6-d783ca295b65' order by created_at desc limit 10;