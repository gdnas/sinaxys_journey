import { useState, useCallback, useEffect } from 'react';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import { useKanban, KanbanTask, TaskStatus } from '@/hooks/useKanban';
import KanbanColumn from './KanbanColumn';
import KanbanTaskCard from './KanbanTaskCard';
import WorkItemForm from './WorkItemForm';
import KanbanTaskDialog from './KanbanTaskDialog';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getProjectWorkflowStatuses, TemplateWorkflowStatus } from '@/lib/templateWorkflowDb';

interface KanbanBoardProps {
  projectId: string;
  projectName: string;
  tasks: KanbanTask[];
  loading?: boolean;
  canEdit?: boolean;
  onRefresh?: () => void;
  onCreateTask?: () => void;
}

export default function KanbanBoard({
  projectId,
  projectName,
  tasks,
  loading = false,
  canEdit = true,
  onRefresh,
  onCreateTask,
}: KanbanBoardProps) {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    moveTask,
    getStatusLabel,
    groupTasksByStatus,
    movingTaskId,
  } = useKanban(projectId);

  const [showCreate, setShowCreate] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);
  const [localTasks, setLocalTasks] = useState<KanbanTask[]>(tasks);

  // KAIROOS 2.0 Fase 1: Load workflow statuses from database (FONTE DA VERDADE)
  const [workflowStatuses, setWorkflowStatuses] = useState<TemplateWorkflowStatus[]>([]);
  const [loadingStatuses, setLoadingStatuses] = useState(true);

  // Sync local tasks with prop tasks
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  // KAIROOS 2.0 Fase 1: Load workflow statuses on mount and when projectId changes
  useEffect(() => {
    async function loadWorkflowStatuses() {
      try {
        setLoadingStatuses(true);
        const statuses = await getProjectWorkflowStatuses(projectId);
        setWorkflowStatuses(statuses);
      } catch (error) {
        console.error('Error loading workflow statuses:', error);
        toast({
          title: 'Erro',
          description: 'Não foi possível carregar os status do projeto',
          variant: 'destructive',
        });
      } finally {
        setLoadingStatuses(false);
      }
    }
    loadWorkflowStatuses();
  }, [projectId, toast]);

  // KAIROOS 2.0 Fase 1: Override getStatusLabel to use workflow statuses
  const getWorkflowStatusLabel = (statusKey: string): string => {
    const status = workflowStatuses.find(s => s.status_key === statusKey);
    return status?.display_name || statusKey;
  };

  // KAIROOS 2.0 Fase 1: Group tasks by workflow statuses from database
  const groupTasksByWorkflowStatus = (tasks: KanbanTask[]): Record<string, KanbanTask[]> => {
    const grouped: Record<string, KanbanTask[]> = {};
    
    // Initialize empty arrays for all workflow statuses
    workflowStatuses.forEach(status => {
      grouped[status.status_key] = [];
    });
    
    // Add tasks to their respective status columns
    tasks.forEach((task) => {
      if (task.status && grouped[task.status]) {
        grouped[task.status].push(task);
      } else {
        // Handle tasks with status not in workflow (fallback to first status)
        const firstStatus = workflowStatuses[0];
        if (firstStatus) {
          grouped[firstStatus.status_key].push(task);
        }
      }
    });
    
    return grouped;
  };

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleDragStart = useCallback((event: DragStartEvent) => {
    const { active } = event;
    const task = localTasks.find((t) => t.id === active.id);
    setActiveTask(task ?? null);
  }, [localTasks]);

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      const { active, over } = event;
      setActiveTask(null);

      if (!over) return;

      const taskId = active.id as string;
      const newStatus = over.id as TaskStatus;

      if (taskId === newStatus) return;

      // Optimistic update
      const optimisticUpdate = (taskId: string, newStatus: TaskStatus) => {
        setLocalTasks((prev) =>
          prev.map((task) =>
            task.id === taskId ? { ...task, status: newStatus } : task
          )
        );
      };

      // Rollback update
      const rollbackUpdate = (taskId: string, oldStatus: TaskStatus) => {
        setLocalTasks((prev) =>
          prev.map((task) =>
            task.id === taskId ? { ...task, status: oldStatus } : task
          )
        );
      };

      const success = await moveTask(taskId, newStatus, optimisticUpdate, rollbackUpdate);

      if (success && onRefresh) {
        onRefresh();
      }
    },
    [localTasks, moveTask, onRefresh]
  );

  const handleTaskClick = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
  }, []);

  const handleEditTask = useCallback((taskId: string) => {
    navigate(`/app/projetos/${projectId}/tarefas/${taskId}/editar`);
  }, [navigate, projectId]);

  const handleChangeAssignee = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
  }, []);

  const handleCreateSubtask = useCallback((taskId: string) => {
    setSelectedTaskId(taskId);
    toast({
      title: 'Funcionalidade em desenvolvimento',
      description: 'Subtarefas serão implementadas em breve',
    });
  }, [toast]);

  const handleDeleteTask = useCallback(async (taskId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('work_items')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      toast({ title: 'Tarefa excluída com sucesso' });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Erro ao excluir tarefa',
        variant: 'destructive',
      });
    }
  }, [toast, onRefresh]);

  // KAIROOS 2.0 Fase 1: Use workflow statuses for grouping
  const groupedTasks = groupTasksByWorkflowStatus(localTasks);

  if (loading || loadingStatuses) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando board...</div>
      </div>
    );
  }

  return (
    <>
      {/* Kanban Board - Horizontal Scroll */}
      <div className="w-full overflow-x-auto overflow-y-hidden">
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-6 min-w-max items-start pb-4">
            {workflowStatuses.map((status) => (
              <KanbanColumn
                key={status.status_key}
                status={status.status_key as unknown as TaskStatus}
                label={status.display_name}
                tasks={groupedTasks[status.status_key] || []}
                projectId={projectId}
                taskCount={groupedTasks[status.status_key]?.length || 0}
                onTaskClick={handleTaskClick}
                onEdit={canEdit ? handleEditTask : undefined}
                onChangeAssignee={canEdit ? handleChangeAssignee : undefined}
                onCreateSubtask={canEdit ? handleCreateSubtask : undefined}
                onDelete={canEdit ? handleDeleteTask : undefined}
              />
            ))}
          </div>

          {/* Drag overlay */}
          <DragOverlay>
            {activeTask ? (
              <KanbanTaskCard task={activeTask} projectId={projectId} isDragging />
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      {/* Create Task Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-3xl p-6" onClick={(e) => e.stopPropagation()}>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Nova tarefa</h3>
              </div>
              <WorkItemForm
                projectId={projectId}
                onSaved={() => {
                  setShowCreate(false);
                  if (onRefresh) onRefresh();
                }}
                onCancel={() => setShowCreate(false)}
              />
            </Card>
          </div>
        </div>
      )}

      {/* Task View Dialog */}
      <KanbanTaskDialog
        taskId={selectedTaskId ?? ''}
        projectId={projectId}
        open={!!selectedTaskId}
        onClose={() => setSelectedTaskId(null)}
        onRefresh={onRefresh}
      />
    </>
  );
}