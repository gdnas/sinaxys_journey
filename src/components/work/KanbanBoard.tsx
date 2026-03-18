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
    STATUS_ORDER,
  } = useKanban(projectId);

  const [showCreate, setShowCreate] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);
  const [localTasks, setLocalTasks] = useState<KanbanTask[]>(tasks);

  // Sync local tasks with prop tasks
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

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

  const groupedTasks = groupTasksByStatus(localTasks);

  if (loading) {
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
            {STATUS_ORDER.map((status) => (
              <KanbanColumn
                key={status}
                status={status}
                label={getStatusLabel(status)}
                tasks={groupedTasks[status]}
                projectId={projectId}
                taskCount={groupedTasks[status].length}
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