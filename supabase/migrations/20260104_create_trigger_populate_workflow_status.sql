-- KAIROOS 2.0 Fase 1: Migration 4
-- Trigger para popular project_workflow_status ao criar projeto

CREATE OR REPLACE FUNCTION populate_project_workflow_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Se projeto está sendo criado e template_type está definido
  IF (TG_OP = 'INSERT' AND NEW.template_type IS NOT NULL) THEN
    -- Inserir status padrão do template (HARDCODED, usado APENAS na criação)
    
    -- BUILD: Para Produto/Tecnologia
    IF NEW.template_type = 'BUILD' THEN
      INSERT INTO project_workflow_status (project_id, status_key, display_name, display_order, color) VALUES
        (NEW.id, 'backlog', 'Backlog', 1, 'bg-slate-100'),
        (NEW.id, 'sprint', 'Sprint', 2, 'bg-blue-100'),
        (NEW.id, 'dev', 'Desenvolvimento', 3, 'bg-indigo-100'),
        (NEW.id, 'test', 'Teste', 4, 'bg-purple-100'),
        (NEW.id, 'done', 'Concluído', 5, 'bg-green-100');
    
    -- PROCESS: Para Operações/Financeiro/CS
    ELSIF NEW.template_type = 'PROCESS' THEN
      INSERT INTO project_workflow_status (project_id, status_key, display_name, display_order, color) VALUES
        (NEW.id, 'todo', 'A Fazer', 1, 'bg-slate-100'),
        (NEW.id, 'doing', 'Em Andamento', 2, 'bg-blue-100'),
        (NEW.id, 'done', 'Concluído', 3, 'bg-green-100');
    
    -- PIPELINE: Para Comercial
    ELSIF NEW.template_type = 'PIPELINE' THEN
      INSERT INTO project_workflow_status (project_id, status_key, display_name, display_order, color) VALUES
        (NEW.id, 'lead', 'Lead', 1, 'bg-yellow-100'),
        (NEW.id, 'contact', 'Contato', 2, 'bg-orange-100'),
        (NEW.id, 'proposal', 'Proposta', 3, 'bg-purple-100'),
        (NEW.id, 'closed', 'Fechado', 4, 'bg-green-100');
    
    -- CAMPAIGN: Para Marketing
    ELSIF NEW.template_type = 'CAMPAIGN' THEN
      INSERT INTO project_workflow_status (project_id, status_key, display_name, display_order, color) VALUES
        (NEW.id, 'idea', 'Ideia', 1, 'bg-pink-100'),
        (NEW.id, 'production', 'Produção', 2, 'bg-indigo-100'),
        (NEW.id, 'review', 'Revisão', 3, 'bg-purple-100'),
        (NEW.id, 'published', 'Publicado', 4, 'bg-blue-100'),
        (NEW.id, 'analysis', 'Análise', 5, 'bg-green-100');
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_populate_project_workflow_status ON projects;
CREATE TRIGGER trg_populate_project_workflow_status
  AFTER INSERT ON projects
  FOR EACH ROW
  EXECUTE FUNCTION populate_project_workflow_status();
