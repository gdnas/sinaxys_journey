-- =====================================================
-- 3. TABELA: asset_assignments
-- Cessões de ativos a colaboradores
-- =====================================================
CREATE TYPE assignment_modality AS ENUM (
  'commodatum',        -- Comodato (gratuito)
  'paid_lease',        -- Cessão onerosa
  'purchase_option'    -- Cessão com opção de aquisição
);

CREATE TYPE assignment_status AS ENUM (
  'active',
  'completed',
  'cancelled'
);

CREATE TABLE IF NOT EXISTS public.asset_assignments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Vínculo com ativo
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  
  -- Vínculo com colaborador
  profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  
  -- Empresa PJ (opcional - para colaboradores PJ)
  contractor_company_id UUID REFERENCES public.contractor_companies(id) ON DELETE SET NULL,
  
  -- Modalidade e valores
  modality assignment_modality NOT NULL,
  monthly_amount NUMERIC(15, 2),  -- Apenas para cessão onerosa
  
  -- Período
  assigned_at DATE NOT NULL DEFAULT CURRENT_DATE,
  expected_until_contract_end BOOLEAN NOT NULL DEFAULT true,
  expected_return_date DATE,  -- Se for null, usa o fim do contrato principal
  
  -- Documento
  signed_document_url TEXT,
  
  -- Status
  status assignment_status NOT NULL DEFAULT 'active',
  returned_at DATE,
  return_condition asset_condition,
  return_notes TEXT,
  
  -- Aquisição pelo colaborador (se aplicável)
  acquired_at DATE,
  acquired_value NUMERIC(15, 2),  -- Valor final negociado
  acquisition_document_url TEXT,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para asset_assignments
CREATE INDEX IF NOT EXISTS idx_asset_assignments_tenant_id ON public.asset_assignments(tenant_id);
CREATE INDEX IF NOT EXISTS idx_asset_assignments_asset_id ON public.asset_assignments(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_assignments_profile_id ON public.asset_assignments(profile_id);
CREATE INDEX IF NOT EXISTS idx_asset_assignments_status ON public.asset_assignments(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_asset_assignments_active ON public.asset_assignments(asset_id) WHERE status = 'active';

-- Constraint: um ativo só pode ter uma cessão ativa por vez
CREATE UNIQUE INDEX IF NOT EXISTS uq_asset_assignments_active_asset 
ON public.asset_assignments(asset_id) 
WHERE status = 'active';

-- =====================================================
-- 4. TABELA: asset_events
-- Histórico auditável de eventos
-- =====================================================
CREATE TYPE asset_event_type AS ENUM (
  'asset_created',
  'asset_updated',
  'asset_reserved',
  'asset_delivered',
  'document_attached',
  'incident_opened',
  'return_registered',
  'acquisition_exercised',
  'asset_discarded',
  'status_changed'
);

CREATE TABLE IF NOT EXISTS public.asset_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Vínculos
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.asset_assignments(id) ON DELETE SET NULL,
  
  -- Tipo de evento
  event_type asset_event_type NOT NULL,
  
  -- Descrição
  title TEXT,
  description TEXT,
  
  -- Metadados (JSON flexível para detalhes específicos)
  metadata JSONB DEFAULT '{}',
  
  -- Quem realizou a ação
  actor_user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Quando ocorreu
  event_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para asset_events
CREATE INDEX IF NOT EXISTS idx_asset_events_tenant_id ON public.asset_events(tenant_id);
CREATE INDEX IF NOT EXISTS idx_asset_events_asset_id ON public.asset_events(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_events_assignment_id ON public.asset_events(assignment_id);
CREATE INDEX IF NOT EXISTS idx_asset_events_event_type ON public.asset_events(tenant_id, event_type);
CREATE INDEX IF NOT EXISTS idx_asset_events_event_date ON public.asset_events(asset_id, event_date DESC);

-- =====================================================
-- 5. TABELA: asset_incidents
-- Ocorrências (dano, perda, furto, roubo)
-- =====================================================
CREATE TYPE incident_type AS ENUM (
  'damage',
  'loss',
  'theft',
  'robbery'
);

CREATE TYPE incident_resolution_status AS ENUM (
  'in_analysis',
  'charged',
  'waived',
  'resolved'
);

CREATE TABLE IF NOT EXISTS public.asset_incidents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Vínculos
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.asset_assignments(id) ON DELETE SET NULL,
  
  -- Tipo e descrição
  incident_type incident_type NOT NULL,
  description TEXT NOT NULL,
  
  -- Data do incidente
  incident_date DATE NOT NULL,
  
  -- Valor residual na data do incidente
  residual_value_at_incident NUMERIC(15, 2) NOT NULL,
  
  -- Documentos
  police_report_url TEXT,
  other_document_urls JSONB DEFAULT '[]',
  
  -- Resolução
  resolution_status incident_resolution_status NOT NULL DEFAULT 'in_analysis',
  resolution_notes TEXT,
  final_decision_amount NUMERIC(15, 2),  -- Valor cobrado/abonado
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para asset_incidents
CREATE INDEX IF NOT EXISTS idx_asset_incidents_tenant_id ON public.asset_incidents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_asset_incidents_asset_id ON public.asset_incidents(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_incidents_assignment_id ON public.asset_incidents(assignment_id);
CREATE INDEX IF NOT EXISTS idx_asset_incidents_status ON public.asset_incidents(tenant_id, resolution_status);
CREATE INDEX IF NOT EXISTS idx_asset_incidents_type ON public.asset_incidents(tenant_id, incident_type);

-- =====================================================
-- 6. TABELA: asset_documents
-- Documentos anexos a ativos, cessões ou ocorrências
-- =====================================================
CREATE TYPE asset_document_type AS ENUM (
  'invoice',
  'warranty',
  'manual',
  'photo',
  'contract',
  'return_receipt',
  'incident_report',
  'acquisition_document',
  'other'
);

CREATE TABLE IF NOT EXISTS public.asset_documents (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Vínculos
  asset_id UUID NOT NULL REFERENCES public.assets(id) ON DELETE CASCADE,
  assignment_id UUID REFERENCES public.asset_assignments(id) ON DELETE SET NULL,
  incident_id UUID REFERENCES public.asset_incidents(id) ON DELETE SET NULL,
  
  -- Tipo e arquivo
  document_type asset_document_type NOT NULL,
  title TEXT NOT NULL,
  file_url TEXT NOT NULL,
  file_name TEXT,
  file_size_bytes BIGINT,
  mime_type TEXT,
  
  -- Upload por
  uploaded_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para asset_documents
CREATE INDEX IF NOT EXISTS idx_asset_documents_tenant_id ON public.asset_documents(tenant_id);
CREATE INDEX IF NOT EXISTS idx_asset_documents_asset_id ON public.asset_documents(asset_id);
CREATE INDEX IF NOT EXISTS idx_asset_documents_assignment_id ON public.asset_documents(assignment_id);
CREATE INDEX IF NOT EXISTS idx_asset_documents_incident_id ON public.asset_documents(incident_id);
CREATE INDEX IF NOT EXISTS idx_asset_documents_type ON public.asset_documents(tenant_id, document_type);

COMMIT;