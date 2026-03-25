/**
 * Gestão de Ativos - Database Types and Interfaces (FIXED)
 *
 * Este arquivo corrige os tipos de interface para garantir que eles correspondam
 * à estrutura real retornada pelas queries do Supabase.
 *
 * NOTA IMPORTANTE:
 * - Supabase JOINs retornam arrays planos, não objetos aninhados
 * - Os tipos foram ajustados para espelhar a estrutura de dados retornado
 */

// =====================
// IMPORTS
// =====================

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
 * Linha da tabela contractor_companies
 */
export interface DbContractorCompany {
  id: string;
  tenant_id: string;
  cnpj: string;
  legal_name: string;
  trade_name: string | null;
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
 * Linha da tabela asset_assignments
 */
export interface DbAssetAssignment {
  id: string;
  tenant_id: string;
  asset_id: string;
  profile_id: string;
  contractor_company_id: string | null;
  modality: AssignmentModality;
  monthly_amount: number | null;
  assigned_at: string; // DATE
  expected_until_contract_end: boolean;
  expected_return_date: string | null; // DATE
  signed_document_url: string | null;
  status: AssignmentStatus;
  returned_at: string | null; // DATE
  return_condition: AssetCondition | null;
  return_notes: string | null;
  acquired_at: string | null; // DATE
  acquired_value: number | null;
  acquisition_document_url: string | null;
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
  event_type: AssetEventType;
  title: string | null;
  description: string | null;
  metadata: any; // JSONB
  actor_user_id: string | null;
  event_date: string;
  created_at: string;
}

/**
 * Linha da tabela asset_incidents
 */
export interface DbAssetIncident {
  id: string;
  tenant_id: string;
  asset_id: string;
  assignment_id: string | null;
  incident_type: IncidentType;
  description: string;
  incident_date: string; // DATE
  residual_value_at_incident: number;
  police_report_url: string | null;
  other_document_urls: any; // JSONB array
  resolution_status: IncidentResolutionStatus;
  resolution_notes: string | null;
  final_decision_amount: number | null;
  created_at: string;
  updated_at: string;
}

/**
 * Linha da tabela asset_documents
 */
export interface DbAssetDocument {
  id: string;
  tenant_id: string;
  asset_id: string;
  assignment_id: string | null;
  incident_id: string | null;
  document_type: AssetDocumentType;
  title: string;
  file_url: string;
  file_name: string | null;
  file_size_bytes: number | null;
  mime_type: string | null;
  uploaded_by: string | null;
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
 * Dados do perfil do colaborador (apenas campos relevantes)
 */
export interface ProfileBasic {
  id: string;
  name: string;
  email: string | null;
  job_title: string | null;
  department_id: string | null;
}

/**
 * Ativo com cessão ativa expandido
 */
export interface AssetWithAssignment {
  id: string;
  tenant_id: string;
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
  status: AssetStatus;
  current_location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // Cessão ativa (expandido)
  current_assignment?: AssignmentExpanded;
  documents?: DbAssetDocument[];
  events?: DbAssetEvent[];
  incidents?: DbAssetIncident[];
  assignment_count?: number;
}

/**
 * Cessão com dados expandidos
 */
export interface AssignmentExpanded extends DbAssetAssignment {
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
  status: AssetStatus;
  current_location: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  
  // Dados do perfil (vindo de query `profile:profiles(...)`)
  profile: ProfileBasic;
  
  // Dados da empresa PJ
  contractor_company?: DbContractorCompany;
  
  // Documentos vinculados
  documents?: DbAssetDocument[];
  
  // Ocorrências vinculadas
  incidents?: DbAssetIncident[];
}

/**
 * Cessão expandida com dados do ativo
 */
export interface AssignmentWithDetails extends AssignmentExpanded {
  asset: DbAsset;
}

/**
 * Ocorrência expandida com dados do ativo e cessão
 */
export interface IncidentWithDetails extends DbAssetIncident {
  asset: DbAsset;
  assignment?: AssignmentExpanded;
  documents?: DbAssetDocument[];
}

/**
 * Documento expandido com dados do ativo
 */
export interface AssetDocumentWithDetails extends DbAssetDocument {
  asset?: DbAsset;
  assignment?: AssignmentExpanded;
  incident?: IncidentWithDetails;
  uploader?: ProfileBasic;
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
  
  // Valores
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
// LABEL HELPERS (para UI)
// =====================

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
