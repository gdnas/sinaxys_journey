import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface KanbanTask {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  assignee_user_id: string | null;
  due_date: string | null;
  start_date: string | null;
  assignee?: {
    id: string;
    name: string;
    email: string;
  } | null;
}

// KAIROOS 2.0 Fase 1 Hardening #1: Status dinâmico, não mais union type fixo
export type TaskStatus = string;

export function useKanban(projectId: string) {
  const { toast } = useToast();
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);

  const moveTask = async (
    taskId: string,
    newStatus: string,
    optimisticUpdate: (taskId: string, newStatus: string) => void,
    rollbackUpdate: (taskId: string, oldStatus: string) => void
  ) => {
    // Prevent multiple simultaneous updates on the same card
    if (movingTaskId === taskId) {
      return;
    }

    // Find current status for rollback
    const currentStatus = await getCurrentTaskStatus(taskId);
    if (!currentStatus) {
      toast({
        title: 'Erro',
        description: 'Tarefa não encontrada',
        variant: 'destructive',
      });
      return false;
    }

    if (currentStatus === newStatus) {
      return true; // No change needed
    }

    setMovingTaskId(taskId);

    // Optimistic update
    optimisticUpdate(taskId, newStatus);

    try {
      const { error } = await supabase
        .from('work_items')
        .update({ status: newStatus })
        .eq('id', taskId);

      if (error) throw error;

      toast({
        title: 'Status atualizado',
        description: 'A tarefa foi movida com sucesso',
      });

      return true;
    } catch (err: any) {
      // Rollback on error
      rollbackUpdate(taskId, currentStatus);

      toast({
        title: 'Erro ao mover tarefa',
        description: err.message || 'Ocorreu um erro ao atualizar o status',
        variant: 'destructive',
      });

      return false;
    } finally {
      setMovingTaskId(null);
    }
  };

  const getCurrentTaskStatus = async (taskId: string): Promise<string | null> => {
    const { data } = await supabase
      .from('work_items')
      .select('status')
      .eq('id', taskId)
      .maybeSingle();

    return data?.status ?? null;
  };

  // KAIROOS 2.0 Fase 1 Hardening #1: getStatusLabel agora aceita string genérico
  // A label deve ser fornecida pelo componente que carrega do banco
  const getStatusLabel = (status: string): string => {
    return status; // Simplificado - o caller deve fornecer a label
  };

  return {
    moveTask,
    getStatusLabel,
    movingTaskId,
  };
}