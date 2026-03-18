import { Card } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { KanbanTask, TaskStatus } from '@/hooks/useKanban';
import KanbanTaskCard from './KanbanTaskCard';

interface KanbanColumnProps {
  status: TaskStatus;
  label: string;
  tasks: KanbanTask[];
  projectId: string;
  taskCount?: number;
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
  onTaskClick,
  onEdit,
  onChangeAssignee,
  onCreateSubtask,
  onDelete,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const taskIds = tasks.map((task) => task.id);

  return (
    <div className="flex-shrink-0 w-80 flex flex-col" style={{ height: 'calc(100vh - 280px)' }}>
      {/* Column header */}
      <div className="mb-3 flex items-center justify-between flex-shrink-0 px-1">
        <h3 className="font-semibold text-sm text-foreground">{label}</h3>
        <span className="text-xs text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full font-medium">
          {taskCount ?? tasks.length}
        </span>
      </div>

      {/* Column content */}
      <Card
        ref={setNodeRef}
        className={`flex-1 p-2 transition-colors overflow-hidden border-border/50 ${
          isOver ? 'bg-accent/50 border-accent' : 'bg-muted/20'
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