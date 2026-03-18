import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, User, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import WorkItemPriorityBadge from './WorkItemPriorityBadge';
import { KanbanTask } from '@/hooks/useKanban';

interface KanbanTaskCardProps {
  task: KanbanTask;
  projectId: string;
  isDragging?: boolean;
}

export default function KanbanTaskCard({ task, projectId, isDragging }: KanbanTaskCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging ? 0.5 : 1,
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return null;
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card
        className={`p-3 cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow ${
          isDragging ? 'ring-2 ring-primary' : ''
        }`}
        {...listeners}
      >
        {/* Drag handle */}
        <div className="flex items-start gap-2">
          <div className="mt-1 text-muted-foreground">
            <GripVertical className="h-4 w-4" />
          </div>

          <div className="flex-1 min-w-0">
            {/* Title */}
            <h4 className="font-medium text-sm mb-2 line-clamp-2">{task.title}</h4>

            {/* Priority badge */}
            <div className="mb-2">
              <WorkItemPriorityBadge priority={task.priority} />
            </div>

            {/* Meta info */}
            <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
              {/* Due date */}
              {task.due_date && (
                <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                  <Calendar className="h-3 w-3" />
                  {formatDate(task.due_date)}
                  {isOverdue && ' (atrasado)'}
                </span>
              )}

              {/* Assignee */}
              {task.assignee && (
                <span className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  <span className="truncate max-w-24">{task.assignee.name || task.assignee.email}</span>
                </span>
              )}
            </div>

            {/* Description preview */}
            {task.description && (
              <p className="text-xs text-muted-foreground mt-2 line-clamp-2">{task.description}</p>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}