import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanTask } from '@/hooks/useKanban';
import KanbanTaskCard from './KanbanTaskCard';
import { AlertTriangle } from 'lucide-react';

// KAIROOS 0.0 Fase 1 Hardening #1: Status dinâmico, não mais union type fixo
interface KanbanColumnProps {
  status: string;
  label: string;
  tasks: KanbanTask[];
  projectId: string;
  taskCount?: number;
  isInvalidStatus?: boolean;
  onTaskClick?: (taskId: string) => void;
  onEdit?: (taskId: string) => void;
  onChangeAssignee?: (taskId: string) => void;
  onCreateSubtask?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
}

export default function KanbanColumn({
  status,
  label,
  tasks,
  projectId,
  taskCount,
  isInvalidStatus = false,
  onTaskClick,
  onEdit,
  onChangeAssignee,
  onCreateSubtask,
  onDelete,
}: KanbanColumnProps) {
  // KAIROOS 2.0 Fase 1 Hardening #2: Coluna de status inválido não aceita drop
  const { setNodeRef, isOver } = useDroppable({
    id: status,
    disabled: isInvalidStatus,
  });

  const taskIds = tasks.map((task) => task.id);

  return (
    <div className="flex-shrink-0 w-80 flex flex-col" style={{ height: 'calc(100vh - 280px)' }}>
      {/* Column header */}
      <div className="mb-3 flex items-center justify-between flex-shrink-0 px-1">
        <div className="flex items-center gap-2">
          {/* KAIROOS 0.0 Fase 1 Hardening #2: Mostrar alerta para coluna de status inválido */}
          {isInvalidStatus && (
            <AlertTriangle className="h-4 w-4 text-red-500" />
          )}
          <h3 className={`font-semibold text-sm ${isInvalidStatus ? 'text-red-600' : 'text-foreground'}`}>
            {label}
          </h3>
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
          isInvalidStatus 
            ? 'bg-red-100 text-red-700' 
            : 'text-muted-foreground bg-muted/50'
        }`}>
          {taskCount ?? tasks.length}
        </span>
      </div>

      {/* Column content */}
      <Card
        ref={setNodeRef}
        className={`flex-1 p-2 transition-colors overflow-hidden border-border/50 ${
          isOver && !isInvalidStatus ? 'bg-accent/50 border-accent' : 
          isInvalidStatus ? 'bg-red-50/50 border-red-200' :
          'bg-muted/20'
        }`}
      >
        <ScrollArea className="h-full pr-1">
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-2 min-h-[100px]">
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground/60">
                  Nenhuma tarefa
                </div>
              ) : (
                tasks.map((task) => (
                  <KanbanTaskCard
                    key={task.id}
                    task={task}
                    projectId={projectId}
                    onTaskClick={onTaskClick}
                    onEdit={onEdit}
                    onChangeAssignee={onChangeAssignee}
                    onCreateSubtask={onCreateSubtask}
                    onDelete={onDelete}
                  />
                ))
              )}
            </div>
          </SortableContext>
        </ScrollArea>
      </Card>
    </div>
  );
}