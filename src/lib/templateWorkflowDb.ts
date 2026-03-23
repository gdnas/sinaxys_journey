/**
 * KAIROOS 2.0 Fase 1: Template Workflow System
 *
 * Este arquivo gerencia os templates de fluxo de status por tipo de projeto.
 * A FONTE DA VERDADE é a tabela project_workflow_status, não estes templates hardcoded.
 * Os templates hardcoded são usados APENAS para popular a tabela na criação do projeto.
 */

import { supabase } from '@/integrations/supabase/client';

// =====================
// TYPES
// =====================

export type TemplateType = 'BUILD' | 'PROCESS' | 'PIPELINE' | 'CAMPAIGN';

export interface TemplateWorkflowStatus {
  status_key: string;
  display_name: string;
  display_order: number;
  color: string;
}

export type TemplateWorkflow = Record<string, TemplateWorkflowStatus>;

// =====================
// HARDCODED WORKFLOWS (APENAS PARA REFERÊNCIA E POPULAÇÃO INICIAL)
// =====================

/**
 * Workflows hardcoded por template type.
 * Usados APENAS para popular project_workflow_status na criação do projeto.
 * A FONTE DA VERDADE para o board é a tabela project_workflow_status.
 */
export const TEMPLATE_WORKFLOWS: Record<TemplateType, TemplateWorkflow> = {
  BUILD: {
    backlog: { status_key: 'backlog', display_name: 'Backlog', display_order: 1, color: 'bg-slate-100' },
    sprint: { status_key: 'sprint', display_name: 'Sprint', display_order: 2, color: 'bg-blue-100' },
    dev: { status_key: 'dev', display_name: 'Desenvolvimento', display_order: 3, color: 'bg-indigo-100' },
    test: { status_key: 'test', display_name: 'Teste', display_order: 4, color: 'bg-purple-100' },
    done: { status_key: 'done', display_name: 'Concluído', display_order: 5, color: 'bg-green-100' },
  },
  PROCESS: {
    todo: { status_key: 'todo', display_name: 'A Fazer', display_order: 1, color: 'bg-slate-100' },
    doing: { status_key: 'doing', display_name: 'Em Andamento', display_order: 2, color: 'bg-blue-100' },
    done: { status_key: 'done', display_name: 'Concluído', display_order: 3, color: 'bg-green-100' },
  },
  PIPELINE: {
    lead: { status_key: 'lead', display_name: 'Lead', display_order: 1, color: 'bg-yellow-100' },
    contact: { status_key: 'contact', display_name: 'Contato', display_order: 2, color: 'bg-orange-100' },
    proposal: { status_key: 'proposal', display_name: 'Proposta', display_order: 3, color: 'bg-purple-100' },
    closed: { status_key: 'closed', display_name: 'Fechado', display_order: 4, color: 'bg-green-100' },
  },
  CAMPAIGN: {
    idea: { status_key: 'idea', display_name: 'Ideia', display_order: 1, color: 'bg-pink-100' },
    production: { status_key: 'production', display_name: 'Produção', display_order: 2, color: 'bg-indigo-100' },
    review: { status_key: 'review', display_name: 'Revisão', display_order: 3, color: 'bg-purple-100' },
    published: { status_key: 'published', display_name: 'Publicado', display_order: 4, color: 'bg-blue-100' },
    analysis: { status_key: 'analysis', display_name: 'Análise', display_order: 5, color: 'bg-green-100' },
  },
};

// =====================
// DATABASE FUNCTIONS (FONTE DA VERDADE)
// =====================

/**
 * Buscar workflow statuses de um projeto (FONTE DA VERDADE)
 *
 * Sempre lê de project_workflow_status (tabela)
 * Trigger popula automaticamente na criação do projeto
 *
 * @param projectId - ID do projeto
 * @returns Array de status do projeto ordenados por display_order
 */
export async function getProjectWorkflowStatuses(projectId: string): Promise<TemplateWorkflowStatus[]> {
  const { data, error } = await supabase
    .from('project_workflow_status')
    .select('*')
    .eq('project_id', projectId)
    .order('display_order', { ascending: true });

  if (error) throw error;
  
  return (data ?? []).map(row => ({
    status_key: row.status_key,
    display_name: row.display_name,
    display_order: row.display_order,
    color: row.color,
  }));
}

/**
 * Obter display label de um status key (fallback para templates hardcoded)
 *
 * @param statusKey - Key do status
 * @returns Display name do status
 */
export function getStatusLabel(statusKey: string): string {
  // Buscar em todos os templates hardcoded
  for (const template of Object.values(TEMPLATE_WORKFLOWS)) {
    if (template[statusKey]) {
      return template[statusKey].display_name;
    }
  }
  
  // Fallback para title case
  return statusKey
    .split('_')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

/**
 * Obter cor de um status key (fallback para templates hardcoded)
 *
 * @param statusKey - Key do status
 * @returns Classe de cor Tailwind
 */
export function getStatusColor(statusKey: string): string {
  // Buscar em todos os templates hardcoded
  for (const template of Object.values(TEMPLATE_WORKFLOWS)) {
    if (template[statusKey]) {
      return template[statusKey].color;
    }
  }
  
  // Fallback
  return 'bg-slate-100';
}

/**
 * Obter ordem de exibição de um status key (fallback para templates hardcoded)
 *
 * @param statusKey - Key do status
 * @returns Ordem de exibição
 */
export function getStatusOrder(statusKey: string): number {
  // Buscar em todos os templates hardcoded
  for (const template of Object.values(TEMPLATE_WORKFLOWS)) {
    if (template[statusKey]) {
      return template[statusKey].display_order;
    }
  }
  
  // Fallback
  return 99;
}
