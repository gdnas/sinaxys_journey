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

export type TaskStatus = 'backlog' | 'todo' | 'in_progress' | 'review' | 'done' | 'blocked';

const STATUS_ORDER: TaskStatus[] = ['backlog', 'todo', 'in_progress', 'review', 'done', 'blocked'];

export function useKanban(projectId: string) {
  const { toast } = useToast();
  const [movingTaskId, setMovingTaskId] = useState<string | null>(null);

  const moveTask = async (
    taskId: string,
    newStatus: TaskStatus,
    optimisticUpdate: (taskId: string, newStatus: TaskStatus) => void,
    rollbackUpdate: (taskId: string, oldStatus: TaskStatus) => void
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
      rollbackUpdate(taskId, currentStatus as TaskStatus);

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

  const getStatusLabel = (status: TaskStatus): string => {
    const labels: Record<TaskStatus, string> = {
      backlog: 'Backlog',
      todo: 'A fazer',
      in_progress: 'Em progresso',
      review: 'Em revisão',
      done: 'Concluído',
      blocked: 'Bloqueado',
    };
    return labels[status] || status;
  };

  const groupTasksByStatus = (tasks: KanbanTask[]): Record<TaskStatus, KanbanTask[]> => {
    const grouped = STATUS_ORDER.reduce((acc, status) => {
      acc[status] = [];
      return acc;
    }, {} as Record<TaskStatus, KanbanTask[]>);

    tasks.forEach((task) => {
      if (task.status && grouped[task.status as TaskStatus]) {
        grouped[task.status as TaskStatus].push(task);
      }
    });

    return grouped;
  };

  return {
    moveTask,
    getStatusLabel,
    groupTasksByStatus,
    movingTaskId,
    STATUS_ORDER,
  };
}