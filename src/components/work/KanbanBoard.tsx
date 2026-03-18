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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, LayoutList, LayoutGrid } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useKanban, KanbanTask, TaskStatus } from '@/hooks/useKanban';
import KanbanColumn from './KanbanColumn';
import KanbanTaskCard from './KanbanTaskCard';
import WorkItemForm from './WorkItemForm';
import { Card } from '@/components/ui/card';

interface KanbanBoardProps {
  projectId: string;
  projectName: string;
  tasks: KanbanTask[];
  loading?: boolean;
  canEdit?: boolean;
  onRefresh?: () => void;
  onViewChange?: (view: 'list' | 'kanban') => void;
}

export default function KanbanBoard({
  projectId,
  projectName,
  tasks,
  loading = false,
  canEdit = true,
  onRefresh,
  onViewChange,
}: KanbanBoardProps) {
  const navigate = useNavigate();
  const {
    moveTask,
    getStatusLabel,
    groupTasksByStatus,
    movingTaskId,
    STATUS_ORDER,
  } = useKanban(projectId);

  const [showCreate, setShowCreate] = useState(false);
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

  const groupedTasks = groupTasksByStatus(localTasks);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Carregando board...</div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="sm" onClick={() => navigate(`/app/projetos/${projectId}`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{projectName}</h1>
            <p className="text-sm text-muted-foreground">Board Kanban</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onViewChange && (
            <Button variant="outline" size="sm" onClick={() => onViewChange('list')}>
              <LayoutList className="mr-2 h-4 w-4" />
              Lista
            </Button>
          )}
          {canEdit && (
            <Button size="sm" onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova tarefa
            </Button>
          )}
        </div>
      </div>

      {/* Kanban Board */}
      <ScrollArea className="flex-1">
        <div className="pb-4">
          <DndContext
            sensors={sensors}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-4 min-h-max">
              {STATUS_ORDER.map((status) => (
                <KanbanColumn
                  key={status}
                  status={status}
                  label={getStatusLabel(status)}
                  tasks={groupedTasks[status]}
                  projectId={projectId}
                  taskCount={groupedTasks[status].length}
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
      </ScrollArea>

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
    </div>
  );
}