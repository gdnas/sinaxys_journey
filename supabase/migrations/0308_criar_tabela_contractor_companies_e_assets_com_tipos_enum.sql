-- =====================================================
-- MÓDULO DE ATIVOS - TABELAS PRINCIPAIS
-- =====================================================

-- Habilitar extensão necessária para UUID (já deve estar habilitada)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- =====================================================
-- 1. TABELA: contractor_companies
-- Empresas PJ dos colaboradores (reutilizável em outros módulos)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.contractor_companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cnpj TEXT NOT NULL UNIQUE,
  legal_name TEXT NOT NULL,
  trade_name TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  city TEXT,
  state TEXT,
  zip_code TEXT,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para contractor_companies
CREATE INDEX IF NOT EXISTS idx_contractor_companies_tenant_id ON public.contractor_companies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_contractor_companies_cnpj ON public.contractor_companies(cnpj);

-- =====================================================
-- 2. TABELA: assets
-- Tabela principal de ativos
-- =====================================================
CREATE TYPE asset_category AS ENUM (
  'it_equipment',
  'office_equipment',
  'mobile_devices',
  'furniture',
  'vehicles',
  'tools',
  'licenses',
  'other'
);

CREATE TYPE asset_status AS ENUM (
  'in_stock',
  'reserved',
  'in_use',
  'in_return',
  'returned',
  'in_maintenance',
  'acquired_by_user',
  'lost',
  'discarded'
);

CREATE TYPE depreciation_method AS ENUM (
  'linear',
  'declining_balance',
  'units_of_production'
);

CREATE TYPE asset_condition AS ENUM (
  'new',
  'good',
  'fair',
  'poor',
  'damaged'
);

CREATE TABLE IF NOT EXISTS public.assets (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tenant_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Identificação
  asset_code TEXT NOT NULL,
  category asset_category NOT NULL,
  asset_type TEXT NOT NULL,
  brand TEXT,
  model TEXT,
  serial_number TEXT UNIQUE,
  
  -- Estado inicial
  condition_initial asset_condition NOT NULL DEFAULT 'new',
  
  -- Dados financeiros
  purchase_date DATE NOT NULL,
  purchase_value NUMERIC(15, 2) NOT NULL,
  supplier TEXT,
  
  -- Depreciação
  useful_life_months INTEGER NOT NULL DEFAULT 48,
  depreciation_method depreciation_method NOT NULL DEFAULT 'linear',
  monthly_depreciation_value NUMERIC(15, 2) GENERATED ALWAYS AS (
    CASE 
      WHEN depreciation_method = 'linear' THEN purchase_value / useful_life_months
      ELSE NULL
    END
  ) STORED,
  
  -- Valor residual calculado (não gerado, atualizado via trigger)
  residual_value_current NUMERIC(15, 2) NOT NULL DEFAULT 0,
  accumulated_depreciation NUMERIC(15, 2) NOT NULL DEFAULT 0,
  
  -- Status e localização
  status asset_status NOT NULL DEFAULT 'in_stock',
  current_location TEXT,
  notes TEXT,
  
  -- Auditoria
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Criar índices para assets
CREATE INDEX IF NOT EXISTS idx_assets_tenant_id ON public.assets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_assets_status ON public.assets(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_assets_category ON public.assets(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_assets_asset_code ON public.assets(tenant_id, asset_code);
CREATE INDEX IF NOT EXISTS idx_assets_serial_number ON public.assets(serial_number) WHERE serial_number IS NOT NULL;

COMMIT;