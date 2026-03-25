/**
 * Gestão de Ativos - Database Types and Interfaces
 */

import { supabase } from "@/integrations/supabase/client";

// =====================
// ENUMS
// =====================

export type AssetCategory =
  | "it_equipment"
  | "office_equipment"
  | "mobile_devices"
  | "furniture"
  | "vehicles"
  | "tools"
  | "licenses"
  | "other";

export type AssetStatus =
  | "in_stock"
  | "reserved"
  | "in_use"
  | "in_return"
  | "returned"
  | "in_maintenance"
  | "acquired_by_user"
  | "lost"
  | "discarded";

export type DepreciationMethod =
  | "linear"
  | "declining_balance"
  | "units_of_production";

export type AssetCondition =
  | "new"
  | "good"
  | "fair"
  | "poor"
  | "damaged";

export type AssignmentModality =
  | "commodatum"
  | "paid_lease"
  | "purchase_option";

export type AssignmentStatus =
  | "active"
  | "completed"
  | "cancelled";

export type AssetEventType =
  | "asset_created"
  | "asset_updated"
  | "asset_reserved"
  | "asset_delivered"
  | "document_attached"
  | "incident_opened"
  | "return_registered"
  | "acquisition_exercised"
  | "asset_discarded"
  | "status_changed";

export type IncidentType =
  | "damage"
  | "loss"
  | "theft"
  | "robbery";

export type IncidentResolutionStatus =
  | "in_analysis"
  | "charged"
  | "waived"
  | "resolved";

export type AssetDocumentType =
  | "invoice"
  | "warranty"
  | "manual"
  | "photo"
  | "contract"
  | "return_receipt"
  | "incident_report"
  | "acquisition_document"
  | "other";

// =====================
// DATABASE ROWS
// =====================

/**
 * Linha da tabela contractor_companies
 */
export interface DbContractorCompany {
  id: string;
  tenant_id: string;
  cnpj: string;
  legal_name: string;
  trade_name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Linha da tabela assets
 */
export interface DbAsset {
  id: string;
  tenant_id: string;
  asset_code: string;
  category: AssetCategory;
  asset_type: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  condition_initial: AssetCondition;
  purchase_date: string; // DATE
  purchase_value: number;
  supplier: string | null;
  useful_life_months: number;
  depreciation_method: DepreciationMethod;
  monthly_depreciation_value: number | null;
  residual_value_current: number;
  accumulated_depreciation: number;
  status: AssetStatus;
  current_location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * Linha da tabela asset_assignments
 */
export interface DbAssetAssignment {
  id: string;
  tenant_id: string;
  
  // Vínculo com ativo
  asset_id: string;
  
  // Vínculo com colaborador
  profile_id: string;
  
  // Empresa PJ (opcional - para colaboradores PJ)
  contractor_company_id: string | null;
  
  // Modalidade e valores
  modality: AssignmentModality;
  monthly_amount: number | null;
  
  // Período
  assigned_at: string; // DATE
  expected_until_contract_end: boolean;
  expected_return_date: string | null; // DATE
  
  // Documento
  signed_document_url: string | null;
  
  // Status
  status: AssignmentStatus;
  returned_at: string | null; // DATE
  return_condition: AssetCondition | null;
  return_notes: string | null;
  
  // Aquisição pelo colaborador (se aplicável)
  acquired_at: string | null; // DATE
  acquired_value: number | null;
  acquisition_document_url: string | null;
  
  // Auditoria
  created_at: string;
  updated_at: string;
}

/**
 * Linha da tabela asset_events
 */
export interface DbAssetEvent {
  id: string;
  tenant_id: string;
  asset_id: string;
  assignment_id: string | null;
  
  // Tipo de evento
  event_type: AssetEventType;
  title: string | null;
  description: string | null;
  
  // Metadados (JSON flexível para detalhes específicos)
  metadata: any; // JSONB
  
  // Quem realizou a ação
  actor_user_id: string | null;
  
  // Quando ocorreu
  event_date: string;
  
  // Auditoria
  created_at: string;
}

/**
 * Linha da tabela asset_incidents
 */
export interface DbAssetIncident {
  id: string;
  tenant_id: string;
  
  // Vínculos
  asset_id: string;
  assignment_id: string | null;
  
  // Tipo e descrição
  incident_type: IncidentType;
  description: string;
  
  // Data do incidente
  incident_date: string; // DATE
  residual_value_at_incident: number; // NUMERIC(15, 2)
  
  // Documentos
  police_report_url: string | null;
  other_document_urls: any; // JSONB array
  
  // Resolução
  resolution_status: IncidentResolutionStatus;
  resolution_notes: string | null;
  final_decision_amount: number | null; // NUMERIC(15, 2)
  
  // Auditoria
  created_at: string;
  updated_at: string;
}

/**
 * Linha da tabela asset_documents
 */
export interface DbAssetDocument {
  id: string;
  tenant_id: string;
  
  // Vínculos
  asset_id: string;
  assignment_id: string | null;
  incident_id: string | null;
  
  // Tipo e arquivo
  document_type: AssetDocumentType;
  title: string;
  file_url: string;
  file_name: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  
  // Upload por
  uploaded_by: string | null;
  
  // Auditoria
  created_at: string;
}

// =====================
// INPUT TYPES
// =====================

/**
 * Input para criação de empresa PJ
 */
export interface CreateContractorCompanyInput {
  tenant_id: string;
  cnpj: string;
  legal_name: string;
  trade_name?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  notes?: string;
}

export interface UpdateContractorCompanyInput {
  legal_name?: string;
  trade_name?: string | null;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip_code?: string | null;
  notes?: string | null;
}

/**
 * Input para criação de ativo
 */
export interface CreateAssetInput {
  tenant_id: string;
  asset_code: string;
  category: AssetCategory;
  asset_type: string;
  brand?: string;
  model?: string;
  serial_number?: string;
  condition_initial?: AssetCondition;
  purchase_date: string; // YYYY-MM-DD
  purchase_value: number;
  supplier?: string;
  useful_life_months?: number;
  depreciation_method?: DepreciationMethod;
  current_location?: string;
  notes?: string;
}

export interface UpdateAssetInput {
  asset_code?: string;
  category?: AssetCategory;
  asset_type?: string;
  brand?: string | null;
  model?: string | null;
  serial_number?: string | null;
  purchase_date?: string;
  purchase_value?: number;
  supplier?: string | null;
  useful_life_months?: number;
  depreciation_method?: DepreciationMethod;
  status?: AssetStatus;
  current_location?: string | null;
  notes?: string | null;
}

/**
 * Input para criação de cessão
 */
export interface CreateAssignmentInput {
  tenant_id: string;
  asset_id: string;
  profile_id: string;
  contractor_company_id?: string;
  modality: AssignmentModality;
  monthly_amount?: number;
  assigned_at?: string; // YYYY-MM-DD
  expected_until_contract_end?: boolean;
  expected_return_date?: string; // YYYY-MM-DD
  signed_document_url?: string;
}

/**
 * Input para completar cessão (devolução)
 */
export interface CompleteAssignmentInput {
  returned_at: string; // YYYY-MM-DD
  return_condition: AssetCondition;
  return_notes?: string;
  acquired_at?: string; // YYYY-MM-DD - se for aquisição
  acquired_value?: number;
  acquisition_document_url?: string;
}

/**
 * Input para atualização de cessão
 */
export interface UpdateAssignmentInput {
  modality?: AssignmentModality;
  monthly_amount?: number | null;
  expected_until_contract_end?: boolean;
  expected_return_date?: string | null;
  signed_document_url?: string | null;
  status?: AssignmentStatus;
}

/**
 * Input para criação de ocorrência
 */
export interface CreateIncidentInput {
  tenant_id: string;
  asset_id: string;
  assignment_id?: string;
  incident_type: IncidentType;
  description: string;
  incident_date: string; // YYYY-MM-DD
  residual_value_at_incident: number;
  police_report_url?: string;
  other_document_urls?: any[];
  resolution_status?: IncidentResolutionStatus;
  resolution_notes?: string;
  final_decision_amount?: number;
}

/**
 * Input para atualização de ocorrência
 */
export interface UpdateIncidentInput {
  incident_type?: IncidentType;
  description?: string;
  incident_date?: string;
  police_report_url?: string;
  other_document_urls?: any;
  resolution_status?: IncidentResolutionStatus;
  resolution_notes?: string;
  final_decision_amount?: number;
}

/**
 * Input para criação de documento
 */
export interface CreateAssetDocumentInput {
  tenant_id: string;
  asset_id: string;
  assignment_id?: string;
  incident_id?: string;
  document_type: AssetDocumentType;
  title: string;
  file_url: string;
  file_name?: string;
  file_size_bytes?: number;
  mime_type?: string;
  uploaded_by?: string;
}

// =====================
// OUTPUT TYPES (EXPANDIDOS)
// =====================

/**
 * Ativo com dados expandido
 */
export interface AssetWithDetails extends DbAsset {
  current_assignment?: DbAssetAssignment & {
    profile: {
      id: string;
      name: string;
      email: string | null;
      job_title: string | null;
      department_id: string | null;
    };
    contractor_company?: DbContractorCompany;
  };
  documents?: DbAssetDocument[];
  events?: DbAssetEvent[];
  incidents?: DbAssetIncident[];
  assignment_count?: number;
}

/**
 * Cessão com dados expandidos (incluindo ativo e empresa PJ)
 */
export interface AssignmentWithDetails extends DbAssetAssignment {
  // Dados do ativo (vindo da query `asset:assets(...)`)
  asset_code: string;
  category: AssetCategory;
  asset_type: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  condition_initial: AssetCondition;
  purchase_date: string;
  purchase_value: number;
  supplier: string | null;
  useful_life_months: number;
  depreciation_method: DepreciationMethod;
  monthly_depreciation_value: number | null;
  residual_value_current: number;
  accumulated_depreciation: number;
  current_location: string | null;
  notes: string | null;

  // Dados do perfil (vindo de query `profile:profiles(...)`)
  profile: {
    id: string;
    name: string;
    email: string | null;
    job_title: string | null;
    department_id: string | null;
  };

  // Dados da empresa PJ
  contractor_company?: DbContractorCompany;

  // Documentos e ocorrências vinculados
  documents?: DbAssetDocument[];
  incidents?: DbAssetIncident[];
}

/**
 * Ocorrência expandida com dados do ativo e cessão
 */
export interface IncidentWithDetails extends DbAssetIncident {
  asset_code: string;
  asset_type: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  category: AssetCategory;
  purchase_value: number;
  residual_value_current: number;

  // Cessão vinculada
  assignment?: AssignmentWithDetails;
  documents?: DbAssetDocument[];
}

/**
 * Documento expandido com dados do ativo
 */
export interface AssetDocumentWithDetails extends DbAssetDocument {
  // Dados do ativo (vindo da query `asset:assets(...)`)
  asset_code: string;
  asset_type: string;
  category: AssetCategory;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  purchase_date: string;
  purchase_value: number;
  supplier: string | null;
  useful_life_months: number;
  depreciation_method: DepreciationMethod;
  residual_value_current: number;
  accumulated_depreciation: number;
  status: AssetStatus;
  current_location: string | null;
  notes: string | null;
  
  // Vínculo com cessão expandido
  assignment?: AssignmentExpanded;
  incident?: DbAssetIncident[];
  documents?: DbAssetDocument[];
}

/**
 * Cessão expandida com dados do ativo
 */
export interface AssignmentExpanded extends DbAssetAssignment {
  // Dados do ativo (vindo de query `asset:assets(...)`)
  asset_code: string;
  category: AssetCategory;
  asset_type: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  condition_initial: AssetCondition;
  purchase_date: string;
  purchase_value: number;
  supplier: string | null;
  useful_life_months: number;
  depreciation_method: DepreciationMethod;
  monthly_depreciation_value: number | null;
  residual_value_current: number;
  accumulated_depreciation: number;
  current_location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // Dados do perfil (vindo de query `profile:profiles(...)`)
  profile: {
    id: string;
    name: string;
    email: string | null;
    job_title: string | null;
    department_id: string | null;
  };
  
  // Dados da empresa PJ
  contractor_company?: DbContractorCompany;
  
  // Documentos vinculados
  documents?: DbAssetDocument[];
  incidents?: DbAssetIncident[];
}

/**
 * Cessão expandida com dados do ativo
 */
export interface AssignmentExpandedWithDetails extends AssignmentExpanded {
  asset: DbAsset;
}

/**
 * Ocorrência expandida com dados do ativo e cessão
 */
export interface IncidentExpanded extends DbAssetIncident {
  // Dados do ativo
  asset_code: string;
  category: AssetCategory;
  asset_type: string;
  brand: string | null;
  model: string | null;
  serial_number: string | null;
  purchase_date: string;
  purchase_value: number;
  residual_value_current: number;
  
  // Cessão
  assignment?: AssignmentExpanded;
  documents?: DbAssetDocument[];
  incidents?: DbAssetIncident[];
}

// =====================
// HELPER TYPES
// =====================

/**
 * Filtros para listagem de ativos
 */
export interface AssetFilters {
  status?: AssetStatus[];
  category?: AssetCategory[];
  search?: string; // busca por código, marca, modelo, série
  available_only?: boolean; // apenas ativos disponíveis (in_stock)
  in_use_only?: boolean; // apenas em uso
  with_pending_return?: boolean; // com devolução pendente
  acquired_by_user?: boolean; // adquiridos por colaboradores
  profile_id?: string; // ativos de um colaborador específico
  date_from?: string; // data de aquisição a partir de
  date_to?: string; // data de aquisição até
  user_role?: string; // papel do usuário para filtros de permissão
  user_department_id?: string; // departamento do usuário para filtros de permissão
  user_id?: string; // ID do usuário para filtros de permissão
}

/**
 * Filtros para listagem de cessões
 */
export interface AssignmentFilters {
  status?: AssignmentStatus[];
  modality?: AssignmentModality[];
  profile_id?: string;
  asset_id?: string;
  assigned_from?: string;
  assigned_to?: string;
  pending_return?: boolean;
}

/**
 * Filtros para listagem de ocorrências
 */
export interface IncidentFilters {
  incident_type?: IncidentType[];
  resolution_status?: IncidentResolutionStatus[];
  asset_id?: string;
  profile_id?: string;
  from_date?: string;
  to_date?: string;
}

/**
 * Opções de ordenação para ativos
 */
export type AssetSortBy =
  | "asset_code_asc"
  | "asset_code_desc"
  | "purchase_value_asc"
  | "purchase_value_desc"
  | "purchase_date_asc"
  | "purchase_date_desc"
  | "residual_value_asc"
  | "residual_value_desc"
  | "created_at_asc"
  | "created_at_desc"
  | "status";

/**
 * Métricas do dashboard de ativos
 */
export interface AssetsDashboardStats {
  total_assets: number;
  total_in_stock: number;
  total_in_use: number;
  total_pending_documentation: number;
  total_lost: number;
  total_in_maintenance: number;
  total_acquired_by_user: number;
  total_purchase_value: number;
  total_residual_value: number;
  
  // Pendências
  assets_without_assignee: number;
  assets_pending_return: number;
  assets_with_incidents_without_resolution: number;
  
  // Alertas operacionais
  contracts_ended_with_assets_in_use: number;
  assets_without_signed_document: number;
  assets_idle_in_stock_over_30_days: number;
}

/**
 * Alerta operacional
 */
export interface OperationalAlert {
  type: "contract_ended_with_assets_in_use"
       | "asset_without_document"
       | "incident_without_resolution"
       | "asset_idle_long";
  asset_id: string;
  asset_code: string;
  message: string;
  severity: "high" | "medium" | "low";
  details?: any;
}

/**
 * Resumo de de depreciação
 */
export interface DepreciationSummary {
  purchase_value: number;
  useful_life_months: number;
  monthly_depreciation: number;
  months_elapsed: number;
  accumulated_depreciation: number;
  residual_value: number;
  depreciation_percentage: number;
}

// =====================
// DATABASE FUNCTIONS
// =====================

// Base select queries
const CONTRACTOR_COMPANIES_BASE_SELECT = 
  "id,tenant_id,cnpj,legal_name,trade_name,email,phone,address,city,state,zip_code,notes,created_at,updated_at";

const ASSETS_BASE_SELECT = 
  "id,tenant_id,asset_code,category,asset_type,brand,model,serial_number,condition_initial,purchase_date,purchase_value,supplier,useful_life_months,depreciation_method,monthly_depreciation_value,residual_value_current,accumulated_depreciation,status,current_location,notes,created_at,updated_at";

const ASSIGNMENTS_BASE_SELECT = 
  "id,tenant_id,asset_id,profile_id,contractor_company_id,modality,monthly_amount,assigned_at,expected_until_contract_end,expected_return_date,signed_document_url,status,returned_at,return_condition,return_notes,acquired_at,acquired_value,acquisition_document_url,created_at,updated_at";

const INCIDENTS_BASE_SELECT = 
  "id,tenant_id,asset_id,assignment_id,incident_type,description,incident_date,residual_value_at_incident,police_report_url,other_document_urls,resolution_status,resolution_notes,final_decision_amount,created_at,updated_at";

const DOCUMENTS_BASE_SELECT = 
  "id,tenant_id,asset_id,assignment_id,incident_id,document_type,title,file_url,file_name,file_size_bytes,mime_type,uploaded_by,created_at";

const EVENTS_BASE_SELECT = 
  "id,tenant_id,asset_id,assignment_id,event_type,title,description,metadata,actor_user_id,event_date,created_at";

// =====================================================
// CONTRACTOR COMPANIES
// =====================================================

export async function listContractorCompanies(tenantId: string) {
  const { data, error } = await supabase
    .from("contractor_companies")
    .select(CONTRACTOR_COMPANIES_BASE_SELECT)
    .eq("tenant_id", tenantId)
    .order("legal_name", { ascending: true });

  if (error) throw error;
  return (data ?? []) as DbContractorCompany[];
}

export async function getContractorCompany(id: string) {
  const { data, error } = await supabase
    .from("contractor_companies")
    .select(CONTRACTOR_COMPANIES_BASE_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as DbContractorCompany | null;
}

export async function createContractorCompany(input: CreateContractorCompanyInput) {
  const { data, error } = await supabase
    .from("contractor_companies")
    .insert({
      tenant_id: input.tenant_id,
      cnpj: input.cnpj,
      legal_name: input.legal_name,
      trade_name: input.trade_name || null,
      email: input.email || null,
      phone: input.phone || null,
      address: input.address || null,
      city: input.city || null,
      state: input.state || null,
      zip_code: input.zip_code || null,
      notes: input.notes || null,
    })
    .select(CONTRACTOR_COMPANIES_BASE_SELECT)
    .single();

  if (error) throw error;
  return data as DbContractorCompany;
}

export async function updateContractorCompany(id: string, patch: UpdateContractorCompanyInput) {
  const { data, error } = await supabase
    .from("contractor_companies")
    .update(patch)
    .eq("id", id)
    .select(CONTRACTOR_COMPANIES_BASE_SELECT)
    .single();

  if (error) throw error;
  return data as DbContractorCompany;
}

export async function deleteContractorCompany(id: string) {
  const { error } = await supabase
    .from("contractor_companies")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// =====================================================
// ASSETS
// =====================================================

export async function listAssets(tenantId: string, filters?: AssetFilters) {
  let query = supabase
    .from("assets")
    .select(ASSETS_BASE_SELECT)
    .eq("tenant_id", tenantId);

  // Aplicar filtros
  if (filters) {
    if (filters.status?.length) {
      query = query.in("status", filters.status);
    }
    if (filters.category?.length) {
      query = query.in("category", filters.category);
    }
    if (filters.available_only) {
      query = query.eq("status", "in_stock");
    }
    if (filters.in_use_only) {
      query = query.eq("status", "in_use");
    }
    if (filters.acquired_by_user) {
      query = query.eq("status", "acquired_by_user");
    }
    if (filters.date_from) {
      query = query.gte("purchase_date", filters.date_from);
    }
    if (filters.date_to) {
      query = query.lte("purchase_date", filters.date_to);
    }
    if (filters.search) {
      // Busca por código, marca, modelo, série
      query = query.or(`asset_code.ilike.%${filters.search}%,brand.ilike.%${filters.search}%,model.ilike.%${filters.search}%,serial_number.ilike.%${filters.search}%`);
    }
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) throw error;

  let assets = (data ?? []) as DbAsset[];

  // Aplicar filtros de permissão por departamento (necessário fazer query separada para assignments)
  if (filters && (filters.user_role === "HEAD" || filters.user_role === "COLABORADOR")) {
    const assetIds = assets.map(a => a.id);
    if (assetIds.length === 0) return [];

    let assignmentsQuery = supabase
      .from("asset_assignments")
      .select("asset_id,profile_id,expected_return_date,signed_document_url")
      .in("asset_id", assetIds)
      .eq("status", "active");

    if (filters.user_role === "COLABORADOR" && filters.user_id) {
      // Colaborador: ver apenas seus próprios ativos
      assignmentsQuery = assignmentsQuery.eq("profile_id", filters.user_id);
    } else if (filters.user_role === "HEAD" && filters.user_department_id) {
      // Head: ver ativos do seu departamento
      const { data: departmentProfiles } = await supabase
        .from("profiles")
        .select("id")
        .eq("department_id", filters.user_department_id);

      if (departmentProfiles && departmentProfiles.length > 0) {
        const profileIds = departmentProfiles.map(p => p.id);
        assignmentsQuery = assignmentsQuery.in("profile_id", profileIds);
      }
    }

    const { data: assignments } = await assignmentsQuery;

    if (assignments && assignments.length > 0) {
      const activeAssetIds = new Set(assignments.map(a => a.asset_id));

      // Colaboradores e Heads veem apenas ativos com cessões ativas
      if (filters.user_role === "COLABORADOR" || filters.user_role === "HEAD") {
        assets = assets.filter(a => activeAssetIds.has(a.id));
      }
    } else if (filters.user_role === "COLABORADOR") {
      // Colaborador sem assignments: não ver nada
      return [];
    }
  }

  // Filtrar ativos com devolução pendente (precisa buscar assignments)
  if (filters?.with_pending_return || filters?.profile_id) {
    const assetIds = assets.map(a => a.id);
    if (assetIds.length === 0) return [];
    
    let assignmentsQuery = supabase
      .from("asset_assignments")
      .select("asset_id,profile_id,expected_return_date,signed_document_url")
      .in("asset_id", assetIds)
      .eq("status", "active");

    if (filters?.profile_id) {
      assignmentsQuery = assignmentsQuery.eq("profile_id", filters.profile_id);
    }
    
    const { data: assignments } = await assignmentsQuery;

    if (assignments && assignments.length > 0) {
      const activeAssetIds = new Set(assignments.map(a => a.asset_id));
      
      if (filters?.with_pending_return) {
        // Filtrar ativos com cessões ativas e data esperada expirada
        const pendingAssetIds = new Set(
          assignments
            .filter(a => a.expected_return_date && new Date(a.expected_return_date) < new Date())
            .map(a => a.asset_id)
        );
        assets = assets.filter(a => pendingAssetIds.has(a.id));
      } else if (filters?.profile_id) {
        // Filtrar ativos do perfil
        assets = assets.filter(a => activeAssetIds.has(a.id));
      } else if (filters.profile_id) {
        // Nenhum assignment encontrado para o perfil
        return [];
      }
    }
  }

  return assets;
}

export async function getAsset(id: string) {
  const { data, error } = await supabase
    .from("assets")
    .select(ASSETS_BASE_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as DbAsset | null;
}

export async function getAssetWithDetails(id: string): Promise<AssetWithDetails | null> {
  const { data: asset, error: assetError } = await supabase
    .from("assets")
    .select(ASSETS_BASE_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (assetError) throw assetError;
  if (!asset) return null;

  // Buscar cessão ativa
    const { data: assignments } = await supabase
      .from("asset_assignments")
      .select(`
        ${ASSIGNMENTS_BASE_SELECT},
        profile:profiles(id,name,email,job_title,department_id),
        contractor_company:contractor_companies(${CONTRACTOR_COMPANIES_BASE_SELECT})
      `)
      .eq("asset_id", id)
      .eq("status", "active")
      .maybeSingle();
  
    // Buscar documentos
    const { data: documents } = await supabase
      .from("asset_documents")
      .select(DOCUMENTS_BASE_SELECT)
      .eq("asset_id", id)
      .order("created_at", { ascending: false });
  
    // Buscar eventos
    const { data: events } = await supabase
      .from("asset_events")
      .select(EVENTS_BASE_SELECT)
      .eq("asset_id", id)
      .order("event_date", { ascending: false })
      .limit(50);
  
    // Buscar ocorrências
    const { data: incidents } = await supabase
      .from("asset_incidents")
      .select(INCIDENTS_BASE_SELECT)
      .eq("asset_id", id)
      .order("created_at", { ascending: false });
  
    // Transformar assignments para extrair arrays
    const transformedAssignment = assignments ? {
      ...assignments,
      profile: Array.isArray(assignments.profile) ? assignments.profile[0] : assignments.profile,
      contractor_company: Array.isArray(assignments.contractor_company) ? assignments.contractor_company[0] : assignments.contractor_company,
    } : undefined;
  
    return {
      ...asset,
      current_assignment: transformedAssignment,
      documents: documents || [],
      events: events || [],
      incidents: incidents || [],
    };
}

export async function createAsset(input: CreateAssetInput) {
  const { data, error } = await supabase
    .from("assets")
    .insert({
      tenant_id: input.tenant_id,
      asset_code: input.asset_code,
      category: input.category,
      asset_type: input.asset_type,
      brand: input.brand || null,
      model: input.model || null,
      serial_number: input.serial_number || null,
      condition_initial: input.condition_initial || "new",
      purchase_date: input.purchase_date,
      purchase_value: input.purchase_value,
      supplier: input.supplier || null,
      useful_life_months: input.useful_life_months || 48,
      depreciation_method: input.depreciation_method || "linear",
      current_location: input.current_location || null,
      notes: input.notes || null,
    })
    .select(ASSETS_BASE_SELECT)
    .single();

  if (error) throw error;
  return data as DbAsset;
}

export async function updateAsset(id: string, patch: UpdateAssetInput) {
  const { data, error } = await supabase
    .from("assets")
    .update(patch)
    .eq("id", id)
    .select(ASSETS_BASE_SELECT)
    .single();

  if (error) throw error;
  return data as DbAsset;
}

export async function deleteAsset(id: string) {
  const { error } = await supabase
    .from("assets")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// =====================================================
// ASSIGNMENTS
// =====================================================

export async function listAssignments(tenantId: string, filters?: AssignmentFilters) {
  let query = supabase
    .from("asset_assignments")
    .select(`
      ${ASSIGNMENTS_BASE_SELECT},
      asset:assets(${ASSETS_BASE_SELECT}),
      profile:profiles(id,name,email,job_title,department_id),
      contractor_company:contractor_companies(${CONTRACTOR_COMPANIES_BASE_SELECT})
    `)
    .eq("tenant_id", tenantId);

  // Aplicar filtros
  if (filters) {
    if (filters.status?.length) {
      query = query.in("status", filters.status);
    }
    if (filters.modality?.length) {
      query = query.in("modality", filters.modality);
    }
    if (filters.profile_id) {
      query = query.eq("profile_id", filters.profile_id);
    }
    if (filters.asset_id) {
      query = query.eq("asset_id", filters.asset_id);
    }
    if (filters.assigned_from) {
      query = query.gte("assigned_at", filters.assigned_from);
    }
    if (filters.assigned_to) {
      query = query.lte("assigned_at", filters.assigned_to);
    }
  }

  const { data, error } = await query.order("assigned_at", { ascending: false });
  
    if (error) throw error;
  
    let assignments = (data ?? []) as any[];
  
    // Transformar arrays para objetos únicos
    assignments = assignments.map(a => ({
      ...a,
      profile: Array.isArray(a.profile) ? a.profile[0] : a.profile,
      contractor_company: Array.isArray(a.contractor_company) ? a.contractor_company[0] : a.contractor_company,
    }));
  
    // Filtrar por devolução pendente (data esperada expirada)
    if (filters?.pending_return) {
      assignments = assignments.filter(
        a => a.status === "active"
          && a.expected_return_date
          && new Date(a.expected_return_date) < new Date()
      );
    }
  
    return assignments as AssignmentWithDetails[];
}

export async function getAssignment(id: string): Promise<AssignmentWithDetails | null> {
  const { data, error } = await supabase
      .from("asset_assignments")
      .select(`
        ${ASSIGNMENTS_BASE_SELECT},
        asset:assets(${ASSETS_BASE_SELECT}),
        profile:profiles(id,name,email,job_title,department_id),
        contractor_company:contractor_companies(${CONTRACTOR_COMPANIES_BASE_SELECT})
      `)
      .eq("id", id)
      .maybeSingle();
  
    if (error) throw error;
  
    if (!data) return null;
  
    // Transformar arrays para objetos únicos
    const transformed: any = {
      ...data,
      profile: Array.isArray(data.profile) ? data.profile[0] : data.profile,
      contractor_company: Array.isArray(data.contractor_company) ? data.contractor_company[0] : data.contractor_company,
    };
  
    return transformed as AssignmentWithDetails | null;
}

export async function createAssignment(input: CreateAssignmentInput) {
  const { data, error } = await supabase
    .from("asset_assignments")
    .insert({
      tenant_id: input.tenant_id,
      asset_id: input.asset_id,
      profile_id: input.profile_id,
      contractor_company_id: input.contractor_company_id || null,
      modality: input.modality,
      monthly_amount: input.monthly_amount || null,
      assigned_at: input.assigned_at || new Date().toISOString().split('T')[0],
      expected_until_contract_end: input.expected_until_contract_end !== undefined ? input.expected_until_contract_end : true,
      expected_return_date: input.expected_return_date || null,
      signed_document_url: input.signed_document_url || null,
      status: "active",
    })
    .select(ASSIGNMENTS_BASE_SELECT)
    .single();

  if (error) throw error;
  return data as DbAssetAssignment;
}

export async function updateAssignment(id: string, patch: UpdateAssignmentInput) {
  const { data, error } = await supabase
    .from("asset_assignments")
    .update(patch)
    .eq("id", id)
    .select(ASSIGNMENTS_BASE_SELECT)
    .single();

  if (error) throw error;
  return data as DbAssetAssignment;
}

export async function completeAssignment(id: string, input: CompleteAssignmentInput) {
  const { data, error } = await supabase
    .from("asset_assignments")
    .update({
      status: "completed",
      returned_at: input.returned_at,
      return_condition: input.return_condition,
      return_notes: input.return_notes || null,
      acquired_at: input.acquired_at || null,
      acquired_value: input.acquired_value || null,
      acquisition_document_url: input.acquisition_document_url || null,
    })
    .select(ASSIGNMENTS_BASE_SELECT)
    .single();

  if (error) throw error;
  return data as DbAssetAssignment;
}

export async function deleteAssignment(id: string) {
  const { error } = await supabase
    .from("asset_assignments")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// =====================================================
// INCIDENTS
// =====================================================

export async function listIncidents(tenantId: string, filters?: IncidentFilters) {
  let query = supabase
    .from("asset_incidents")
    .select(`
      ${INCIDENTS_BASE_SELECT},
      asset:assets(${ASSETS_BASE_SELECT}),
      assignment:asset_assignments(${ASSIGNMENTS_BASE_SELECT})
    `)
    .eq("tenant_id", tenantId);

  // Aplicar filtros
  if (filters) {
    if (filters.incident_type?.length) {
      query = query.in("incident_type", filters.incident_type);
    }
    if (filters.resolution_status?.length) {
      query = query.in("resolution_status", filters.resolution_status);
    }
    if (filters.asset_id) {
      query = query.eq("asset_id", filters.asset_id);
    }
    if (filters.from_date) {
      query = query.gte("incident_date", filters.from_date);
    }
    if (filters.to_date) {
      query = query.lte("incident_date", filters.to_date);
    }
  }

  const { data, error } = await query.order("incident_date", { ascending: false });
  
    if (error) throw error;
  
    let incidents = (data ?? []) as any[];
  
    // Transformar arrays para objetos únicos
    incidents = incidents.map(i => ({
      ...i,
      assignment: Array.isArray(i.assignment) ? i.assignment[0] : i.assignment,
    }));
  
    // Filtrar por perfil (precisa buscar via assignments)
    if (filters?.profile_id) {
      const assignmentIds = incidents
        .filter(i => i.assignment?.profile_id === filters.profile_id)
        .map(i => i.assignment_id);
      incidents = incidents.filter(i => assignmentIds.includes(i.assignment_id!));
    }
  
    return incidents as IncidentWithDetails[];
}

export async function getIncident(id: string): Promise<IncidentWithDetails | null> {
  const { data, error } = await supabase
      .from("asset_incidents")
      .select(`
        ${INCIDENTS_BASE_SELECT},
        asset:assets(${ASSETS_BASE_SELECT}),
        assignment:asset_assignments(${ASSIGNMENTS_BASE_SELECT})
      `)
      .eq("id", id)
      .maybeSingle();
  
    if (error) throw error;
  
    if (!data) return null;
  
    // Transformar arrays para objetos únicos
    const transformed: any = {
      ...data,
      assignment: Array.isArray(data.assignment) ? data.assignment[0] : data.assignment,
    };
  
    return transformed as IncidentWithDetails | null;
}

export async function createIncident(input: CreateIncidentInput) {
  const { data, error } = await supabase
    .from("asset_incidents")
    .insert({
      tenant_id: input.tenant_id,
      asset_id: input.asset_id,
      assignment_id: input.assignment_id || null,
      incident_type: input.incident_type,
      description: input.description,
      incident_date: input.incident_date,
      residual_value_at_incident: input.residual_value_at_incident,
      police_report_url: input.police_report_url || null,
      other_document_urls: input.other_document_urls || [],
      resolution_status: input.resolution_status || "in_analysis",
      resolution_notes: input.resolution_notes || null,
      final_decision_amount: input.final_decision_amount || null,
    })
    .select(INCIDENTS_BASE_SELECT)
    .single();

  if (error) throw error;

  // Logar evento de ocorrência aberta
  if (input.assignment_id) {
    await supabase.rpc("log_asset_event", {
      p_asset_id: input.asset_id,
      p_event_type: "incident_opened",
      p_title: "Ocorrência aberta",
      p_description: `Ocorrência do tipo ${input.incident_type} foi registrada.`,
      p_assignment_id: input.assignment_id,
      p_metadata: {
        incident_type: input.incident_type,
        incident_date: input.incident_date,
      },
    });
  }

  return data as DbAssetIncident;
}

export async function updateIncident(id: string, patch: UpdateIncidentInput) {
  const { data, error } = await supabase
    .from("asset_incidents")
    .update(patch)
    .eq("id", id)
    .select(INCIDENTS_BASE_SELECT)
    .single();

  if (error) throw error;
  return data as DbAssetIncident;
}

export async function deleteIncident(id: string) {
  const { error } = await supabase
    .from("asset_incidents")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// =====================================================
// DOCUMENTS
// =====================================================

export async function listAssetDocuments(tenantId: string, assetId?: string) {
  let query = supabase
    .from("asset_documents")
    .select(DOCUMENTS_BASE_SELECT)
    .eq("tenant_id", tenantId);

  if (assetId) {
    query = query.eq("asset_id", assetId);
  }

  const { data, error } = await query.order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DbAssetDocument[];
}

export async function getAssetDocument(id: string) {
  const { data, error } = await supabase
    .from("asset_documents")
    .select(DOCUMENTS_BASE_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as DbAssetDocument | null;
}

export async function createAssetDocument(input: CreateAssetDocumentInput) {
  const { data, error } = await supabase
    .from("asset_documents")
    .insert({
      tenant_id: input.tenant_id,
      asset_id: input.asset_id,
      assignment_id: input.assignment_id || null,
      incident_id: input.incident_id || null,
      document_type: input.document_type,
      title: input.title,
      file_url: input.file_url,
      file_name: input.file_name || null,
      file_size_bytes: input.file_size_bytes || null,
      mime_type: input.mime_type || null,
      uploaded_by: input.uploaded_by || null,
    })
    .select(DOCUMENTS_BASE_SELECT)
    .single();

  if (error) throw error;

  // Logar evento de documento anexado
  if (input.assignment_id) {
    await supabase.rpc("log_asset_event", {
      p_asset_id: input.asset_id,
      p_event_type: "document_attached",
      p_title: "Documento anexado",
      p_description: `Documento do tipo ${input.document_type} foi anexado.`,
      p_assignment_id: input.assignment_id,
      p_metadata: {
        document_type: input.document_type,
        document_title: input.title,
      },
    });
  }

  return data as DbAssetDocument;
}

export async function deleteAssetDocument(id: string) {
  const { error } = await supabase
    .from("asset_documents")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

// =====================================================
// EVENTS (READ-ONLY - criados via triggers)
// =====================================================

export async function listAssetEvents(assetId: string, limit: number = 50) {
  const { data, error } = await supabase
    .from("asset_events")
    .select(EVENTS_BASE_SELECT)
    .eq("asset_id", assetId)
    .order("event_date", { ascending: false })
    .limit(limit);

  if (error) throw error;
  return (data ?? []) as DbAssetEvent[];
}

// =====================================================
// DASHBOARD STATS
// =====================================================

export async function getAssetsDashboardStats(tenantId: string): Promise<AssetsDashboardStats> {
  // Buscar todos os ativos do tenant
    const { data: assets, error: assetsError } = await supabase
      .from("assets")
      .select("id,status,category,purchase_value,residual_value_current,purchase_date,created_at")
      .eq("tenant_id", tenantId);
  
    if (assetsError) throw assetsError;
  
    const assetsData = assets || [];

  // Calcular estatísticas básicas
  const stats: AssetsDashboardStats = {
    total_assets: assetsData.length,
    total_in_stock: assetsData.filter(a => a.status === "in_stock").length,
    total_in_use: assetsData.filter(a => a.status === "in_use").length,
    total_pending_documentation: 0,
    total_lost: assetsData.filter(a => a.status === "lost").length,
    total_in_maintenance: assetsData.filter(a => a.status === "in_maintenance").length,
    total_acquired_by_user: assetsData.filter(a => a.status === "acquired_by_user").length,
    
    total_purchase_value: assetsData.reduce((sum, a) => sum + (a.purchase_value || 0), 0),
    total_residual_value: assetsData.reduce((sum, a) => sum + (a.residual_value_current || 0), 0),
    
    // Pendências
    assets_without_assignee: 0,
    assets_pending_return: 0,
    assets_with_incidents_without_resolution: 0,
    
    // Alertas operacionais
    contracts_ended_with_assets_in_use: 0,
    assets_without_signed_document: 0,
    assets_idle_in_stock_over_30_days: 0,
  };

  // Buscar assignments ativos para cálculos adicionais
  const { data: assignments, error: assignmentsError } = await supabase
    .from("asset_assignments")
    .select("asset_id,profile_id,expected_return_date,signed_document_url")
    .eq("tenant_id", tenantId)
    .eq("status", "active");

  if (assignmentsError) throw assignmentsError;
  const activeAssignments = assignments || [];
  const activeAssetIds = new Set(activeAssignments.map(a => a.asset_id));

  // Calcular assets_without_assignee
  stats.assets_without_assignee = assetsData.filter(
    a => a.status === "in_use" && !activeAssetIds.has(a.id)
  ).length;

  // Calcular assets_pending_return
  const now = new Date();
  stats.assets_pending_return = activeAssignments.filter(
    a => a.expected_return_date && new Date(a.expected_return_date) < now
  ).length;

  // Calcular assets_without_signed_document
  stats.assets_without_signed_document = activeAssignments.filter(
    a => !a.signed_document_url
  ).length;

  // Calcular assets_idle_in_stock_over_30_days
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  stats.assets_idle_in_stock_over_30_days = assetsData.filter(
    a => a.status === "in_stock" && new Date(a.created_at) < thirtyDaysAgo
  ).length;

  // Calcular assets_with_incidents_without_resolution
  const { data: incidents, error: incidentsError } = await supabase
    .from("asset_incidents")
    .select("asset_id")
    .in("resolution_status", ["in_analysis"]);

  if (!incidentsError && incidents) {
    const incidentAssetIds = new Set(incidents.map(i => i.asset_id));
    stats.assets_with_incidents_without_resolution = incidentAssetIds.size;
  }

  // Buscar documentos para calcular pending_documentation
  const assetIds = assetsData.map(a => a.id);
  if (assetIds.length > 0) {
    const { data: documents } = await supabase
      .from("asset_documents")
      .select("asset_id")
      .in("asset_id", assetIds)
      .eq("document_type", "invoice");

    const assetsWithInvoice = new Set((documents || []).map(d => d.asset_id));
    stats.total_pending_documentation = assetsData.filter(a => !assetsWithInvoice.has(a.id)).length;
  }

  return stats;
}

// =====================================================
// FILE UPLOAD
// =====================================================

export const ASSET_DOCUMENTS_BUCKET = "asset-documents";

export async function uploadAssetDocumentFile({
  tenantId,
  assetId,
  file,
}: {
  tenantId: string;
  assetId: string;
  file: File;
}) {
  const fileExt = file.name.split(".").pop();
  const fileName = `${Date.now()}.${fileExt}`;
  const filePath = `${tenantId}/${assetId}/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(ASSET_DOCUMENTS_BUCKET)
    .upload(filePath, file, {
      contentType: file.type || undefined,
      // Allow upsert so uploads don't fail if the generated filename collides.
      // Overwriting is acceptable here because filenames are timestamp-based and collisions are unlikely,
      // but upsert prevents 400 errors when the storage already contains the same path.
      upsert: true,
    });

  if (uploadError) {
    // Normalize error information and throw a helpful message
    const errInfo: any = {};
    if (typeof uploadError === 'string') {
      errInfo.message = uploadError;
    } else if (uploadError && typeof uploadError === 'object') {
      // Copy common fields
      errInfo.message = uploadError.message || JSON.stringify(uploadError);
      if (uploadError.status) errInfo.status = uploadError.status;
      if (uploadError.statusCode) errInfo.statusCode = uploadError.statusCode;
      if (uploadError.details) errInfo.details = uploadError.details;
    }

    // If the bucket wasn't found, provide a clearer action message
    const messageLower = (errInfo.message || "").toLowerCase();
    if (messageLower.includes("bucket not found") || messageLower.includes("not found")) {
      throw new Error(
        "Bucket de armazenamento 'asset-documents' não encontrado. Por favor, crie o bucket via Supabase Console. Detalhes: " + (errInfo.message || JSON.stringify(errInfo))
      );
    }

    // Otherwise throw a composed error with status/details if available
    const composed = `Erro no upload do arquivo: ${errInfo.message || JSON.stringify(errInfo)}${errInfo.status ? ` (status: ${errInfo.status})` : ''}${errInfo.statusCode ? ` (statusCode: ${errInfo.statusCode})` : ''}${errInfo.details ? ` - ${JSON.stringify(errInfo.details)}` : ''}`;
    throw new Error(composed);
  }

  return {
    path: filePath,
    fileName: file.name,
    mimeType: file.type || null,
    fileSize: file.size,
  };
}

export async function createAssetDocumentSignedUrl(path: string, expiresIn: number = 60) {
  const { data, error } = await supabase.storage
    .from(ASSET_DOCUMENTS_BUCKET)
    .createSignedUrl(path, expiresIn);

  if (error) throw error;
  return data.signedUrl;
}

export async function deleteAssetDocumentFile(path: string) {
  const { error } = await supabase.storage
    .from(ASSET_DOCUMENTS_BUCKET)
    .remove([path]);

  if (error) throw error;
}

// =====================================================
// DEPRECIATION HELPERS
// =====================================================

export function calculateDepreciationSummary(
  asset: DbAsset
): DepreciationSummary {
  const purchaseDate = new Date(asset.purchase_date);
  const now = new Date();
  
  // Calcular meses decorridos
  const monthsElapsed = Math.floor(
    (now.getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30.44)
  );
  
  // Depreciação mensal
  const monthlyDepreciation = asset.purchase_value / asset.useful_life_months;
  
  // Depreciação acumulada
  const accumulatedDepreciation = Math.min(
    asset.purchase_value,
    monthlyDepreciation * monthsElapsed
  );
  
  // Valor residual
  const residualValue = Math.max(0, asset.purchase_value - accumulatedDepreciation);
  
  // Porcentagem depreciação
  const depreciationPercentage = (accumulatedDepreciation / asset.purchase_value) * 100;

  return {
    purchase_value: asset.purchase_value,
    useful_life_months: asset.useful_life_months,
    monthly_depreciation: monthlyDepreciation,
    months_elapsed: monthsElapsed,
    accumulated_depreciation: accumulatedDepreciation,
    residual_value: residualValue,
    depreciation_percentage: depreciationPercentage,
  };
}

// =====================================================
// LABEL HELPERS (para UI)
// =====================================================

export function getAssetStatusLabel(status: AssetStatus): string {
  const labels: Record<AssetStatus, string> = {
    in_stock: "Em estoque",
    reserved: "Reservado",
    in_use: "Em uso",
    in_return: "Em devolução",
    returned: "Devolvido",
    in_maintenance: "Em manutenção",
    acquired_by_user: "Adquirido pelo colaborador",
    lost: "Extraviado",
    discarded: "Descartado",
  };
  return labels[status] || status;
}

export function getAssetCategoryLabel(category: AssetCategory): string {
  const labels: Record<AssetCategory, string> = {
    it_equipment: "Equipamento de TI",
    office_equipment: "Equipamento de escritório",
    mobile_devices: "Dispositivo móvel",
    furniture: "Móvel",
    vehicles: "Veículo",
    tools: "Ferramenta",
    licenses: "Licença de software",
    other: "Outro",
  };
  return labels[category] || category;
}

export function getAssignmentModalityLabel(modality: AssignmentModality): string {
  const labels: Record<AssignmentModality, string> = {
    commodatum: "Comodato (gratuito)",
    paid_lease: "Cessão onerosa",
    purchase_option: "Cessão com opção de aquisição",
  };
  return labels[modality] || modality;
}

export function getAssignmentStatusLabel(status: AssignmentStatus): string {
  const labels: Record<AssignmentStatus, string> = {
    active: "Ativa",
    completed: "Completada",
    cancelled: "Cancelada",
  };
  return labels[status] || status;
}

export function getAssetConditionLabel(condition: AssetCondition): string {
  const labels: Record<AssetCondition, string> = {
    new: "Novo",
    good: "Bom",
    fair: "Regular",
    poor: "Ruim",
    damaged: "Danificado",
  };
  return labels[condition] || condition;
}

export function getIncidentTypeLabel(type: IncidentType): string {
  const labels: Record<IncidentType, string> = {
    damage: "Dano",
    loss: "Perda",
    theft: "Furto",
    robbery: "Roubo",
  };
  return labels[type] || type;
}

export function getIncidentResolutionStatusLabel(status: IncidentResolutionStatus): string {
  const labels: Record<IncidentResolutionStatus, string> = {
    in_analysis: "Em análise",
    charged: "Cobrado",
    waived: "Abonado",
    resolved: "Resolvido",
  };
  return labels[status] || status;
}

export function getAssetDocumentTypeLabel(type: AssetDocumentType): string {
  const labels: Record<AssetDocumentType, string> = {
    invoice: "Nota fiscal",
    warranty: "Garantia",
    manual: "Manual",
    photo: "Foto",
    contract: "Contrato/termo",
    return_receipt: "Recibo de devolução",
    incident_report: "Laudo de ocorrência",
    acquisition_document: "Documento de aquisição",
    other: "Outro",
  };
  return labels[type] || type;
}