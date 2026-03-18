import { Card } from '@/components/ui/card';
import { Calendar, User, GripVertical } from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import WorkItemPriorityBadge from './WorkItemPriorityBadge';
import { KanbanTask } from '@/hooks/useKanban';

interface KanbanTaskCardProps {
  task: KanbanTask;
  projectId: string;
  isDragging?: boolean;
  onTaskClick?: (taskId: string) => void;
}

export default function KanbanTaskCard({ task, projectId, isDragging, onTaskClick }: KanbanTaskCardProps) {
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

  const handleCardClick = () => {
    if (onTaskClick && !isSortableDragging) {
      onTaskClick(task.id);
    }
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes}>
      <Card
        className={`p-2.5 hover:shadow-md transition-all cursor-pointer bg-background border-border/50 hover:border-border ${
          isDragging ? 'ring-2 ring-primary shadow-lg' : ''
        }`}
        onClick={handleCardClick}
      >
        {/* Header: Title + Priority */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm leading-tight line-clamp-2">{task.title}</h4>
          </div>
          <div className="flex-shrink-0">
            <WorkItemPriorityBadge priority={task.priority} />
          </div>
        </div>

        {/* Description preview */}
        {task.description && (
          <p className="text-xs text-muted-foreground mb-2 line-clamp-2 leading-relaxed">{task.description}</p>
        )}

        {/* Footer: Drag handle + Meta info */}
        <div className="flex items-center gap-2">
          {/* Drag handle */}
          <div
            className="text-muted-foreground/50 cursor-grab active:cursor-grabbing hover:text-muted-foreground transition-colors"
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-3.5 w-3.5" />
          </div>

          {/* Meta info */}
          <div className="flex items-center gap-2 text-xs text-muted-foreground flex-1">
            {/* Due date */}
            {task.due_date && (
              <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                <Calendar className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{formatDate(task.due_date)}</span>
              </span>
            )}

            {/* Assignee */}
            {task.assignee && (
              <span className="flex items-center gap-1 truncate">
                <User className="h-3 w-3 flex-shrink-0" />
                <span className="truncate max-w-20">{task.assignee.name || task.assignee.email}</span>
              </span>
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}