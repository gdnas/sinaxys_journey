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
import { useKanban, KanbanTask } from '@/hooks/useKanban';
import KanbanColumn from './KanbanColumn';
import KanbanTaskCard from './KanbanTaskCard';
import WorkItemForm from './WorkItemForm';
import KanbanTaskDialog from './KanbanTaskDialog';
import { Card } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { getProjectWorkflowStatuses, TemplateWorkflowStatus } from '@/lib/templateWorkflowDb';
import { AlertTriangle } from 'lucide-react';

interface KanbanBoardProps {
  projectId: string;
  projectName: string;
  tasks: KanbanTask[];
  loading?: boolean;
  canEdit?: boolean;
  onRefresh?: () => void;
  onCreateTask?: () => void;
}

// KAIROOS 2.0 Fase 1 Hardening #2: Constante para coluna de fallback de status inválido
const INVALID_STATUS_KEY = '__invalid__';
const INVALID_STATUS_LABEL = 'Status inválido';

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
  const { moveTask, movingTaskId } = useKanban(projectId);

  const [showCreate, setShowCreate] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [activeTask, setActiveTask] = useState<KanbanTask | null>(null);
  const [localTasks, setLocalTasks] = useState<KanbanTask[]>(tasks);

  // Load workflow statuses from database (FONTE DA VERDADE)
  const [workflowStatuses, setWorkflowStatuses] = useState<TemplateWorkflowStatus[]>([]);
  const [loadingStatuses, setLoadingStatuses] = useState(true);

  // Sync local tasks with prop tasks
  useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  // Load workflow statuses on mount and when projectId changes
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

  // KAIROOS 0.0 Fase 1 Hardening #2: Agrupar tasks por workflow statuses com fallback explícito para inválidos
  const groupTasksByWorkflowStatus = (tasks: KanbanTask[]): Record<string, KanbanTask[]> => {
    const grouped: Record<string, KanbanTask[]> = {};
    
    // Initialize empty arrays for all workflow statuses
    workflowStatuses.forEach(status => {
      grouped[status.status_key] = [];
    });
    
    // Initialize array for invalid statuses
    grouped[INVALID_STATUS_KEY] = [];
    
    // Track tasks with invalid statuses
    const invalidTaskIds: string[] = [];
    
    // Add tasks to their respective status columns
    tasks.forEach((task) => {
      if (!task.status || task.status === '') {
        // Task with empty/null status - treat as invalid
        grouped[INVALID_STATUS_KEY].push(task);
        invalidTaskIds.push(task.id);
      } else if (grouped[task.status]) {
        // Valid status in workflow
        grouped[task.status].push(task);
      } else {
        // Status not in workflow - invalid
        grouped[INVALID_STATUS_KEY].push(task);
        invalidTaskIds.push(task.id);
      }
    });
    
    // Log warning if there are invalid tasks
    if (invalidTaskIds.length > 0) {
      console.warn(
        `[KanbanBoard] Found ${invalidTaskIds.length} tasks with invalid status for project ${projectId}. ` +
        `Invalid task IDs: ${invalidTaskIds.join(', ')}. ` +
        `Valid status keys: ${workflowStatuses.map(s => s.status_key).join(', ')}.`
      );
    }
    
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
      const newStatus = over.id as string;

      if (taskId === newStatus) return;

      // KAIROOS 2.0 Fase 1 Hardening #2: Impedir arrastar para coluna de status inválido
      if (newStatus === INVALID_STATUS_KEY) {
        toast({
          title: 'Operação não permitida',
          description: 'Não é possível mover tarefas para a coluna de status inválido',
          variant: 'destructive',
        });
        return;
      }

      // Optimistic update
      const optimisticUpdate = (taskId: string, newStatus: string) => {
        setLocalTasks((prev) =>
          prev.map((task) =>
            task.id === taskId ? { ...task, status: newStatus } : task
          )
        );
      };

      // Rollback update
      const rollbackUpdate = (taskId: string, oldStatus: string) => {
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
    [localTasks, moveTask, onRefresh, toast]
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

  // Use workflow statuses for grouping
  const groupedTasks = groupTasksByWorkflowStatus(localTasks);
  
  // KAIROOS 2.0 Fase 1 Hardening #2: Determinar quais colunas mostrar
  const columnStatuses = [...workflowStatuses];
  const invalidTaskCount = groupedTasks[INVALID_STATUS_KEY]?.length ?? 0;
  
  // KAIROOS 0.0 Fase 1 Hardening #2: Adicionar coluna de status inválido apenas se houver itens
  if (invalidTaskCount > 0) {
    columnStatuses.push({
      status_key: INVALID_STATUS_KEY,
      display_name: INVALID_STATUS_LABEL,
      display_order: 999,
      color: 'bg-red-100',
    });
  }

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
            {columnStatuses.map((status) => (
              <KanbanColumn
                key={status.status_key}
                status={status.status_key}
                label={status.display_name}
                tasks={groupedTasks[status.status_key] || []}
                projectId={projectId}
                taskCount={groupedTasks[status.status_key]?.length || 0}
                isInvalidStatus={status.status_key === INVALID_STATUS_KEY}
                onTaskClick={handleTaskClick}
                onEdit={canEdit && status.status_key !== INVALID_STATUS_KEY ? handleEditTask : undefined}
                onChangeAssignee={canEdit && status.status_key !== INVALID_STATUS_KEY ? handleChangeAssignee : undefined}
                onCreateSubtask={canEdit && status.status_key !== INVALID_STATUS_KEY ? handleCreateSubtask : undefined}
                onDelete={canEdit && status.status_key !== INVALID_STATUS_KEY ? handleDeleteTask : undefined}
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