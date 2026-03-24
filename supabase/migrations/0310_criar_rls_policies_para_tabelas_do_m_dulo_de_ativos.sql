-- =====================================================
-- RLS POLICIES PARA MÓDULO DE ATIVOS
-- =====================================================

-- Habilitar RLS em todas as tabelas
ALTER TABLE public.contractor_companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.asset_documents ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- HELPER FUNCTIONS (se já existirem, não recriar)
-- =====================================================

-- Verificar se as funções auxiliares existem antes de usá-las
-- Assumindo que as funções de RLS da Kairoos já existem:
-- - is_masteradmin()
-- - is_admin_of_company(company_id)
-- - is_member_of_company(company_id)
-- - is_head_of_department(department_id)
-- - is_manager_of(user_id)

-- =====================================================
-- POLICIES: contractor_companies
-- =====================================================

-- SELECT: MASTERADMIN e ADMIN podem ver todas da empresa
CREATE POLICY "contractor_companies_select_masteradmin" ON public.contractor_companies
  FOR SELECT USING (is_masteradmin());

CREATE POLICY "contractor_companies_select_admin_company" ON public.contractor_companies
  FOR SELECT USING (is_admin_of_company(tenant_id));

CREATE POLICY "contractor_companies_select_members" ON public.contractor_companies
  FOR SELECT USING (is_member_of_company(tenant_id));

-- INSERT: MASTERADMIN e ADMIN
CREATE POLICY "contractor_companies_insert_masteradmin" ON public.contractor_companies
  FOR INSERT WITH CHECK (is_masteradmin());

CREATE POLICY "contractor_companies_insert_admin" ON public.contractor_companies
  FOR INSERT WITH CHECK (is_admin_of_company(tenant_id));

-- UPDATE: MASTERADMIN e ADMIN
CREATE POLICY "contractor_companies_update_masteradmin" ON public.contractor_companies
  FOR UPDATE USING (is_masteradmin()) WITH CHECK (is_masteradmin());

CREATE POLICY "contractor_companies_update_admin" ON public.contractor_companies
  FOR UPDATE USING (is_admin_of_company(tenant_id)) 
  WITH CHECK (is_admin_of_company(tenant_id));

-- DELETE: MASTERADMIN e ADMIN
CREATE POLICY "contractor_companies_delete_masteradmin" ON public.contractor_companies
  FOR DELETE USING (is_masteradmin());

CREATE POLICY "contractor_companies_delete_admin" ON public.contractor_companies
  FOR DELETE USING (is_admin_of_company(tenant_id));

-- =====================================================
-- POLICIES: assets
-- =====================================================

-- SELECT: MASTERADMIN, ADMIN e membros da empresa podem ver
CREATE POLICY "assets_select_masteradmin" ON public.assets
  FOR SELECT USING (is_masteradmin());

CREATE POLICY "assets_select_admin_company" ON public.assets
  FOR SELECT USING (is_admin_of_company(tenant_id));

CREATE POLICY "assets_select_members" ON public.assets
  FOR SELECT USING (is_member_of_company(tenant_id));

-- INSERT: MASTERADMIN e ADMIN
CREATE POLICY "assets_insert_masteradmin" ON public.assets
  FOR INSERT WITH CHECK (is_masteradmin());

CREATE POLICY "assets_insert_admin" ON public.assets
  FOR INSERT WITH CHECK (is_admin_of_company(tenant_id));

-- UPDATE: MASTERADMIN e ADMIN
CREATE POLICY "assets_update_masteradmin" ON public.assets
  FOR UPDATE USING (is_masteradmin()) WITH CHECK (is_masteradmin());

CREATE POLICY "assets_update_admin" ON public.assets
  FOR UPDATE USING (is_admin_of_company(tenant_id)) 
  WITH CHECK (is_admin_of_company(tenant_id));

-- DELETE: MASTERADMIN e ADMIN
CREATE POLICY "assets_delete_masteradmin" ON public.assets
  FOR DELETE USING (is_masteradmin());

CREATE POLICY "assets_delete_admin" ON public.assets
  FOR DELETE USING (is_admin_of_company(tenant_id));

-- =====================================================
-- POLICIES: asset_assignments
-- =====================================================

-- SELECT: MASTERADMIN, ADMIN, HEAD (do time), e o próprio colaborador (profile)
CREATE POLICY "asset_assignments_select_masteradmin" ON public.asset_assignments
  FOR SELECT USING (is_masteradmin());

CREATE POLICY "asset_assignments_select_admin_company" ON public.asset_assignments
  FOR SELECT USING (is_admin_of_company(tenant_id));

CREATE POLICY "asset_assignments_select_head_department" ON public.asset_assignments
  FOR SELECT USING (
    is_head_of_department(
      (SELECT department_id FROM public.profiles WHERE id = profile_id)
    )
  );

CREATE POLICY "asset_assignments_select_own" ON public.asset_assignments
  FOR SELECT USING (auth.uid() = profile_id);

-- INSERT: MASTERADMIN e ADMIN
CREATE POLICY "asset_assignments_insert_masteradmin" ON public.asset_assignments
  FOR INSERT WITH CHECK (is_masteradmin());

CREATE POLICY "asset_assignments_insert_admin" ON public.asset_assignments
  FOR INSERT WITH CHECK (is_admin_of_company(tenant_id));

-- UPDATE: MASTERADMIN e ADMIN
CREATE POLICY "asset_assignments_update_masteradmin" ON public.asset_assignments
  FOR UPDATE USING (is_masteradmin()) WITH CHECK (is_masteradmin());

CREATE POLICY "asset_assignments_update_admin" ON public.asset_assignments
  FOR UPDATE USING (is_admin_of_company(tenant_id)) 
  WITH CHECK (is_admin_of_company(tenant_id));

-- DELETE: MASTERADMIN e ADMIN
CREATE POLICY "asset_assignments_delete_masteradmin" ON public.asset_assignments
  FOR DELETE USING (is_masteradmin());

CREATE POLICY "asset_assignments_delete_admin" ON public.asset_assignments
  FOR DELETE USING (is_admin_of_company(tenant_id));

-- =====================================================
-- POLICIES: asset_events
-- (herdam as mesmas permissões de assets, pois são só leitura)
-- =====================================================

CREATE POLICY "asset_events_select_masteradmin" ON public.asset_events
  FOR SELECT USING (is_masteradmin());

CREATE POLICY "asset_events_select_admin_company" ON public.asset_events
  FOR SELECT USING (is_admin_of_company(tenant_id));

CREATE POLICY "asset_events_select_members" ON public.asset_events
  FOR SELECT USING (is_member_of_company(tenant_id));

-- INSERT: Qualquer pessoa autenticada (via triggers)
CREATE POLICY "asset_events_insert_authenticated" ON public.asset_events
  FOR INSERT WITH CHECK (true);

-- =====================================================
-- POLICIES: asset_incidents
-- =====================================================

CREATE POLICY "asset_incidents_select_masteradmin" ON public.asset_incidents
  FOR SELECT USING (is_masteradmin());

CREATE POLICY "asset_incidents_select_admin_company" ON public.asset_incidents
  FOR SELECT USING (is_admin_of_company(tenant_id));

CREATE POLICY "asset_incidents_select_head_department" ON public.asset_incidents
  FOR SELECT USING (
    is_head_of_department(
      (SELECT department_id FROM public.profiles WHERE id = (
        SELECT profile_id FROM public.asset_assignments WHERE id = asset_incidents.assignment_id
      ))
    )
  );

CREATE POLICY "asset_incidents_select_own" ON public.asset_incidents
  FOR SELECT USING (auth.uid() = (
    SELECT profile_id FROM public.asset_assignments WHERE id = asset_incidents.assignment_id
  ));

-- INSERT: MASTERADMIN e ADMIN
CREATE POLICY "asset_incidents_insert_masteradmin" ON public.asset_incidents
  FOR INSERT WITH CHECK (is_masteradmin());

CREATE POLICY "asset_incidents_insert_admin" ON public.asset_incidents
  FOR INSERT WITH CHECK (is_admin_of_company(tenant_id));

-- UPDATE: MASTERADMIN e ADMIN
CREATE POLICY "asset_incidents_update_masteradmin" ON public.asset_incidents
  FOR UPDATE USING (is_masteradmin()) WITH CHECK (is_masteradmin());

CREATE POLICY "asset_incidents_update_admin" ON public.asset_incidents
  FOR UPDATE USING (is_admin_of_company(tenant_id)) 
  WITH CHECK (is_admin_of_company(tenant_id));

-- DELETE: MASTERADMIN e ADMIN
CREATE POLICY "asset_incidents_delete_masteradmin" ON public.asset_incidents
  FOR DELETE USING (is_masteradmin());

CREATE POLICY "asset_incidents_delete_admin" ON public.asset_incidents
  FOR DELETE USING (is_admin_of_company(tenant_id));

-- =====================================================
-- POLICIES: asset_documents
-- =====================================================

CREATE POLICY "asset_documents_select_masteradmin" ON public.asset_documents
  FOR SELECT USING (is_masteradmin());

CREATE POLICY "asset_documents_select_admin_company" ON public.asset_documents
  FOR SELECT USING (is_admin_of_company(tenant_id));

CREATE POLICY "asset_documents_select_members" ON public.asset_documents
  FOR SELECT USING (is_member_of_company(tenant_id));

-- INSERT: MASTERADMIN, ADMIN e qualquer membro autenticado
CREATE POLICY "asset_documents_insert_masteradmin" ON public.asset_documents
  FOR INSERT WITH CHECK (is_masteradmin());

CREATE POLICY "asset_documents_insert_admin" ON public.asset_documents
  FOR INSERT WITH CHECK (is_admin_of_company(tenant_id));

CREATE POLICY "asset_documents_insert_members" ON public.asset_documents
  FOR INSERT WITH CHECK (is_member_of_company(tenant_id) AND uploaded_by = auth.uid());

-- DELETE: MASTERADMIN, ADMIN e quem fez o upload
CREATE POLICY "asset_documents_delete_masteradmin" ON public.asset_documents
  FOR DELETE USING (is_masteradmin());

CREATE POLICY "asset_documents_delete_admin" ON public.asset_documents
  FOR DELETE USING (is_admin_of_company(tenant_id));

CREATE POLICY "asset_documents_delete_own" ON public.asset_documents
  FOR DELETE USING (uploaded_by = auth.uid());

COMMIT;