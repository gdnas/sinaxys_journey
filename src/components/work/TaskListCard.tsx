import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Calendar, User, MoreHorizontal, ExternalLink, Edit, UserPlus, Plus, Trash2 } from 'lucide-react';
import WorkItemPriorityBadge from './WorkItemPriorityBadge';
import WorkItemStatusBadge from './WorkItemStatusBadge';

interface TaskListCardProps {
  task: any;
  projectId: string;
  canEdit?: boolean;
  onTaskClick?: (taskId: string) => void;
  onEdit?: (taskId: string) => void;
  onChangeAssignee?: (taskId: string) => void;
  onCreateSubtask?: (taskId: string) => void;
  onDelete?: (taskId: string) => void;
}

export default function TaskListCard({
  task,
  projectId,
  canEdit = true,
  onTaskClick,
  onEdit,
  onChangeAssignee,
  onCreateSubtask,
  onDelete,
}: TaskListCardProps) {
  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Sem prazo';
    return new Date(dateString).toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status !== 'done';

  const handleCardClick = () => {
    if (onTaskClick) {
      onTaskClick(task.id);
    }
  };

  const handleMenuAction = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };

  return (
    <Card
      className="p-4 hover:shadow-md transition-all cursor-pointer bg-background border-border/50 hover:border-border group"
      onClick={handleCardClick}
    >
      <div className="flex items-start justify-between gap-4">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          {/* Header: Status + Title + Priority */}
          <div className="flex items-center gap-3 mb-2">
            <WorkItemStatusBadge status={task.status} />
            <h3 className="font-semibold text-base leading-tight flex-1">{task.title}</h3>
            <WorkItemPriorityBadge priority={task.priority} />
          </div>

          {/* Description */}
          {task.description && (
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2 leading-relaxed">
              {task.description}
            </p>
          )}

          {/* Meta info */}
          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
            {/* Due date */}
            <span className={`flex items-center gap-1.5 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
              <Calendar className="h-3.5 w-3.5 flex-shrink-0" />
              <span>{formatDate(task.due_date)}</span>
            </span>

            {/* Assignee */}
            {task.assignee && (
              <span className="flex items-center gap-1.5">
                <User className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate max-w-32">{task.assignee.name || task.assignee.email}</span>
              </span>
            )}
          </div>
        </div>

        {/* Actions menu */}
        <div className="flex-shrink-0">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={(e) => handleMenuAction(e, () => onTaskClick?.(task.id))}>
                <ExternalLink className="mr-2 h-4 w-4" />
                Abrir tarefa
              </DropdownMenuItem>
              {canEdit && (
                <>
                  <DropdownMenuItem onClick={(e) => handleMenuAction(e, () => onEdit?.(task.id))}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => handleMenuAction(e, () => onChangeAssignee?.(task.id))}>
                    <UserPlus className="mr-2 h-4 w-4" />
                    Mudar responsável
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={(e) => handleMenuAction(e, () => onCreateSubtask?.(task.id))}>
                    <Plus className="mr-2 h-4 w-4" />
                    Criar subtarefa
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(e) => handleMenuAction(e, () => onDelete?.(task.id))}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                </>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </Card>
  );
}