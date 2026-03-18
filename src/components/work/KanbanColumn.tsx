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
}

export default function KanbanColumn({ status, label, tasks, projectId, taskCount }: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: status,
  });

  const taskIds = tasks.map((task) => task.id);

  return (
    <div className="flex-shrink-0 w-80 flex flex-col" style={{ height: 'calc(100vh - 280px)' }}>
      {/* Column header */}
      <div className="mb-3 flex items-center justify-between flex-shrink-0">
        <h3 className="font-semibold text-sm">{label}</h3>
        <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
          {taskCount ?? tasks.length}
        </span>
      </div>

      {/* Column content */}
      <Card
        ref={setNodeRef}
        className={`flex-1 p-3 transition-colors overflow-hidden ${
          isOver ? 'bg-accent/50' : 'bg-muted/30'
        }`}
      >
        <ScrollArea className="h-full pr-2">
          <SortableContext items={taskIds} strategy={verticalListSortingStrategy}>
            <div className="space-y-3 min-h-[100px]">
              {tasks.length === 0 ? (
                <div className="text-center py-8 text-xs text-muted-foreground">
                  Nenhuma tarefa
                </div>
              ) : (
                tasks.map((task) => (
                  <KanbanTaskCard key={task.id} task={task} projectId={projectId} />
                ))
              )}
            </div>
          </SortableContext>
        </ScrollArea>
      </Card>
    </div>
  );
}