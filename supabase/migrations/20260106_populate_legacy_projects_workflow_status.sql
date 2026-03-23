-- KAIROOS 2.0 Fase 1: Migration 6
-- Popular project_workflow_status para projetos legados (PRESERVANDO STATUS REAIS, FILTRANDO NULO/VAZIO)

-- Para cada projeto legado, primeiro verificar status REAIS usados pelos work_items
-- Depois popular project_workflow_status preservando esses status
-- KAIROOS 2.0 Fase 1 Hardening #3: Filtros explícitos para garantir robustez

-- CTE para identificar status únicos por projeto (filtrando nulo/vazio com btrim)
WITH project_real_statuses AS (
  SELECT DISTINCT
    p.id AS project_id,
    wi.status AS status_key
  FROM projects p
  LEFT JOIN work_items wi ON wi.project_id = p.id
  WHERE p.id NOT IN (
    SELECT project_id FROM project_workflow_status
  )
  -- KAIROOS 2.0 Fase 1 Hardening #3: Filtros explícitos para segurança
  AND wi.project_id IS NOT NULL
  AND wi.status IS NOT NULL
  AND btrim(wi.status) <> ''
),
-- Mapear status reais para display_name e cor
status_mapping AS (
  SELECT 
    project_id,
    status_key,
    COALESCE(
      CASE status_key
        WHEN 'backlog' THEN 'Backlog'
        WHEN 'todo' THEN 'A Fazer'
        WHEN 'doing' THEN 'Em Andamento'
        WHEN 'in_progress' THEN 'Em Andamento'
        WHEN 'sprint' THEN 'Sprint'
        WHEN 'dev' THEN 'Desenvolvimento'
        WHEN 'test' THEN 'Teste'
        WHEN 'review' THEN 'Revisão'
        WHEN 'done' THEN 'Concluído'
        WHEN 'lead' THEN 'Lead'
        WHEN 'contact' THEN 'Contato'
        WHEN 'proposal' THEN 'Proposta'
        WHEN 'closed' THEN 'Fechado'
        WHEN 'idea' THEN 'Ideia'
        WHEN 'production' THEN 'Produção'
        WHEN 'published' THEN 'Publicado'
        WHEN 'analysis' THEN 'Análise'
        ELSE INITCAP(status_key)
      END,
      'Desconhecido'
    ) AS display_name,
    COALESCE(
      CASE status_key
        WHEN 'backlog' THEN 1
        WHEN 'todo' THEN 1
        WHEN 'lead' THEN 1
        WHEN 'idea' THEN 1
        WHEN 'doing' THEN 2
        WHEN 'in_progress' THEN 2
        WHEN 'sprint' THEN 2
        WHEN 'contact' THEN 2
        WHEN 'production' THEN 2
        WHEN 'dev' THEN 3
        WHEN 'test' THEN 4
        WHEN 'review' THEN 3
        WHEN 'proposal' THEN 3
        WHEN 'done' THEN 3
        WHEN 'closed' THEN 4
        WHEN 'published' THEN 4
        WHEN 'analysis' THEN 5
        ELSE 99
      END,
      1
    ) AS display_order,
    COALESCE(
      CASE status_key
        WHEN 'backlog' THEN 'bg-slate-100'
        WHEN 'todo' THEN 'bg-slate-100'
        WHEN 'lead' THEN 'bg-yellow-100'
        WHEN 'idea' THEN 'bg-pink-100'
        WHEN 'doing' THEN 'bg-blue-100'
        WHEN 'in_progress' THEN 'bg-blue-100'
        WHEN 'sprint' THEN 'bg-blue-100'
        WHEN 'contact' THEN 'bg-orange-100'
        WHEN 'production' THEN 'bg-indigo-100'
        WHEN 'dev' THEN 'bg-indigo-100'
        WHEN 'test' THEN 'bg-purple-100'
        WHEN 'review' THEN 'bg-purple-100'
        WHEN 'done' THEN 'bg-green-100'
        WHEN 'closed' THEN 'bg-green-100'
        WHEN 'published' THEN 'bg-blue-100'
        WHEN 'analysis' THEN 'bg-green-100'
        ELSE 'bg-gray-100'
      END,
      'bg-slate-100'
    ) AS color
  FROM project_real_statuses
)
-- Inserir status reais encontrados
INSERT INTO project_workflow_status (project_id, status_key, display_name, display_order, color)
SELECT 
  project_id,
  status_key,
  display_name,
  display_order,
  color
FROM status_mapping
ON CONFLICT (project_id, status_key) DO NOTHING;

-- Para projetos que não têm work_items ou work_items com status nulo/vazio, 
-- popular com status padrão PROCESS
-- KAIROOS 2.0 Fase 1 Hardening #3: Apenas se não tiver workflow status ainda
INSERT INTO project_workflow_status (project_id, status_key, display_name, display_order, color)
SELECT 
  p.id,
  'todo',
  'A Fazer',
  1,
  'bg-slate-100'
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_workflow_status pws WHERE pws.project_id = p.id
);

INSERT INTO project_workflow_status (project_id, status_key, display_name, display_order, color)
SELECT 
  p.id,
  'doing',
  'Em Andamento',
  2,
  'bg-blue-100'
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_workflow_status pws WHERE pws.project_id = p.id AND pws.status_key = 'doing'
);

INSERT INTO project_workflow_status (project_id, status_key, display_name, display_order, color)
SELECT 
  p.id,
  'done',
  'Concluído',
  3,
  'bg-green-100'
FROM projects p
WHERE NOT EXISTS (
  SELECT 1 FROM project_workflow_status pws WHERE pws.project_id = p.id AND pws.status_key = 'done'
);