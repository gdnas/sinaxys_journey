import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, startOfWeek, endOfWeek, isToday, isPast, isWithinInterval } from 'date-fns';

export type UnifiedWorkItem = {
  id: string;
  tenant_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  type: string;
  status: string;
  priority: string;
  assignee_user_id: string | null;
  parent_id: string | null;
  start_date: string | null;
  due_date: string | null;
  completed_at: string | null;
  created_by_user_id: string;
  created_at: string;
  updated_at: string;
  key_result_id: string | null;
  deliverable_id: string | null;
  estimate_minutes: number | null;
  checklist: any;
  // Contexto de projeto
  project_name: string | null;
  project_template_type: string | null;
  // Contexto de OKR
  key_result_title: string | null;
  deliverable_title: string | null;
  objective_title: string | null;
  cycle_label: string | null;
  // Contexto para ordenação e filtros
  urgency_score: number;
  is_overdue: boolean;
  is_today: boolean;
  is_this_week: boolean;
};

export type TimeFilter = 'all' | 'today' | 'this_week' | 'overdue';
export type ContextFilter = 'all' | 'projects' | 'okrs';

interface UseUnifiedWorkItemsOptions {
  userId: string;
  timeFilter?: TimeFilter;
  contextFilter?: ContextFilter;
}

interface UseUnifiedWorkItemsResult {
  workItems: UnifiedWorkItem[];
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
  updateWorkItemStatus: (workItemId: string, newStatus: string) => Promise<void>;
}

export function useUnifiedWorkItems({
  userId,
  timeFilter = 'all',
  contextFilter = 'all'
}: UseUnifiedWorkItemsOptions): UseUnifiedWorkItemsResult {
  const queryClient = useQueryClient();

  // Buscar work items unificados
  const { data: workItems = [], isLoading, error, refetch } = useQuery({
    queryKey: ['unifiedWorkItems', userId],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('work_items_for_user_unified', {
        p_user_id: userId,
        p_from: null,
        p_to: null,
      });

      if (error) throw error;
      return (data ?? []) as UnifiedWorkItem[];
    },
    enabled: !!userId,
  });

  // Mutation para atualizar status de um work item
  const updateWorkItemStatusMutation = useMutation({
    mutationFn: async ({ workItemId, newStatus }: { workItemId: string; newStatus: string }) => {
      const { error } = await supabase
        .from('work_items')
        .update({ 
          status: newStatus,
          completed_at: newStatus === 'DONE' ? new Date().toISOString() : null
        })
        .eq('id', workItemId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['unifiedWorkItems', userId] });
    },
  });

  // Filtrar work items baseado nos filtros selecionados
  const filteredWorkItems = workItems.filter(item => {
    // Filtrar por contexto (projetos vs OKRs)
    if (contextFilter === 'projects' && !item.project_id) return false;
    if (contextFilter === 'okrs' && !item.key_result_id) return false;

    // Filtrar por tempo
    if (timeFilter === 'today' && !item.is_today) return false;
    if (timeFilter === 'this_week' && !item.is_this_week) return false;
    if (timeFilter === 'overdue' && !item.is_overdue) return false;

    return true;
  });

  // Agrupar work items por categoria para exibição
  const todayItems = filteredWorkItems.filter(item => item.is_today);
  const overdueItems = filteredWorkItems.filter(item => item.is_overdue);
  const thisWeekItems = filteredWorkItems.filter(item => item.is_this_week && !item.is_today && !item.is_overdue);
  const otherItems = filteredWorkItems.filter(item => !item.is_today && !item.is_overdue && !item.is_this_week);

  // Criar uma lista ordenada priorizando itens atrasados, de hoje e da semana
  const sortedWorkItems = [
    ...overdueItems,
    ...todayItems,
    ...thisWeekItems,
    ...otherItems
  ];

  const updateWorkItemStatus = async (workItemId: string, newStatus: string) => {
    await updateWorkItemStatusMutation.mutateAsync({ workItemId, newStatus });
  };

  return {
    workItems: sortedWorkItems,
    isLoading,
    error: error as Error | null,
    refetch,
    updateWorkItemStatus,
  };
}

// Helper para obter contagens por categoria
export function useUnifiedWorkItemCounts(userId: string) {
  const { data: workItems = [], isLoading } = useQuery({
    queryKey: ['unifiedWorkItems', userId, 'counts'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('work_items_for_user_unified', {
        p_user_id: userId,
        p_from: null,
        p_to: null,
      });

      if (error) throw error;
      return (data ?? []) as UnifiedWorkItem[];
    },
    enabled: !!userId,
  });

  const counts = {
    total: workItems.length,
    today: workItems.filter(item => item.is_today).length,
    overdue: workItems.filter(item => item.is_overdue).length,
    thisWeek: workItems.filter(item => item.is_this_week).length,
    projects: workItems.filter(item => item.project_id).length,
    okrs: workItems.filter(item => item.key_result_id).length,
  };

  return { counts, isLoading };
}
