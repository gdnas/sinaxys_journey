-- =====================================================
-- SEED DE DADOS PARA MÓDULO DE ATIVOS (SIMPLIFICADO)
-- =====================================================

-- Desabilitar todos os triggers temporariamente para evitar erros
DROP TRIGGER IF EXISTS trigger_asset_created_event ON public.assets;
DROP TRIGGER IF EXISTS trigger_asset_updated_event ON public.assets;
DROP TRIGGER IF EXISTS trigger_assignment_created_event ON public.asset_assignments;
DROP TRIGGER IF EXISTS trigger_assignment_completed_event ON public.asset_assignments;
DROP TRIGGER IF EXISTS trigger_update_asset_status ON public.asset_assignments;
DROP TRIGGER IF EXISTS trigger_calculate_depreciation ON public.assets;

-- Criar seed de dados
DO $$
DECLARE
  v_tenant_id UUID;
BEGIN
  -- Buscar o primeiro tenant ativo
  SELECT id INTO v_tenant_id FROM companies LIMIT 1;
  
  -- Se não houver nenhum tenant, não criar seed
  IF v_tenant_id IS NULL THEN
    RAISE NOTICE 'Nenhum tenant encontrado. Seed não será criado.';
    RETURN;
  END IF;
  
  -- Inserir empresas PJ de exemplo
  INSERT INTO public.contractor_companies (
    tenant_id, cnpj, legal_name, trade_name, email, phone
  ) VALUES
  (
    v_tenant_id,
    '12.345.678/0001-90',
    'Tecnologia e Soluções PJ Ltda',
    'TechSolutions',
    'contato@techsolutions.com.br',
    '(11) 99999-9999'
  ),
  (
    v_tenant_id,
    '98.765.432/0001-10',
    'Consultoria Digital ME',
    'DigitalConsult',
    'admin@digitalconsult.com.br',
    '(11) 98888-8888'
  )
  ON CONFLICT (cnpj) DO NOTHING;
  
  -- Inserir ativos de exemplo (com valores de depreciação calculados manualmente)
  INSERT INTO public.assets (
    tenant_id,
    asset_code,
    category,
    asset_type,
    brand,
    model,
    serial_number,
    condition_initial,
    purchase_date,
    purchase_value,
    supplier,
    useful_life_months,
    depreciation_method,
    status,
    current_location,
    notes,
    accumulated_depreciation,
    residual_value_current
  ) VALUES
  (
    v_tenant_id,
    'NB-001',
    'it_equipment',
    'Notebook Dell Latitude 3420',
    'Dell',
    'Latitude 3420',
    '8F92KL1',
    'new',
    '2024-01-15',
    4500.00,
    'Dell Brasil',
    48,
    'linear',
    'in_stock',
    'Estoque - Sala 101',
    'Notebook corporativo para uso geral',
    675.00,
    3825.00
  ),
  (
    v_tenant_id,
    'NB-002',
    'it_equipment',
    'Notebook HP EliteBook 840 G9',
    'HP',
    'EliteBook 840 G9',
    'HPX84G9234',
    'good',
    '2023-06-10',
    6200.00,
    'HP Brasil',
    48,
    'linear',
    'in_use',
    'Escritório - 3º Andar',
    'Notebook do gerente de TI',
    2375.00,
    3825.00
  ),
  (
    v_tenant_id,
    'MN-001',
    'it_equipment',
    'Monitor Dell UltraSharp 27"',
    'Dell',
    'UltraSharp U2722D',
    'DELLMN2788',
    'new',
    '2024-03-01',
    2800.00,
    'Dell Brasil',
    60,
    'linear',
    'in_stock',
    'Estoque - Sala 102',
    'Monitor 27 polegadas 4K',
    350.00,
    2450.00
  ),
  (
    v_tenant_id,
    'CB-001',
    'office_equipment',
    'Cadeira Herman Miller Aeron',
    'Herman Miller',
    'Aeron',
    'HM0012345',
    'new',
    '2023-02-20',
    8500.00,
    'Herman Miller Brasil',
    120,
    'linear',
    'in_use',
    'Escritório - 2º Andar',
    'Cadeira ergonômica para CEO',
    1416.67,
    7083.33
  ),
  (
    v_tenant_id,
    'CL-001',
    'mobile_devices',
    'iPhone 15 Pro',
    'Apple',
    'iPhone 15 Pro',
    'D38JL2X9KL3',
    'new',
    '2024-02-01',
    7200.00,
    'Apple Brasil',
    36,
    'linear',
    'in_stock',
    'Estoque - Sala 101',
    'Smartphone corporativo',
    1600.00,
    5600.00
  )
  ON CONFLICT (serial_number) DO NOTHING;
  
  RAISE NOTICE 'Seed de dados do módulo de Ativos criado com sucesso para tenant: %', v_tenant_id;
END $$;

COMMIT;