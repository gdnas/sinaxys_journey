import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreVertical } from 'lucide-react';
import { Calendar, User } from 'lucide-react';
import { format } from 'date-fns';

export default function TaskCard({ task, projectId }: { task: any; projectId: string }) {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h3 className="text-lg font-semibold">{task.title}</h3>
            <TaskStatusBadge status={task.status} />
            <TaskPriorityBadge priority={task.priority} />
          </div>
          <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
            <span className="flex items-center gap-1">
              <Calendar className="h-3 w-3" />
              {task.due_date ? format(new Date(task.due_date), 'dd/MM/yyyy') : 'Sem prazo'}
            </span>
            {task.assignee_user_id && (
              <span className="flex items-center gap-1">
                <User className="h-3 w-3" />
                {task.assignee?.name || task.assignee?.email || '—'}
              </span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/app/projetos/${projectId}/tarefas/${task.id}`} className="block">
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </Card>
  );
}

export function TaskStatusBadge({ status }: { status: string }) {
  const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    backlog: { label: 'Backlog', variant: 'secondary' },
    todo: { label: 'A fazer', variant: 'default' },
    in_progress: { label: 'Em progresso', variant: 'default' },
    review: { label: 'Em revisão', variant: 'secondary' },
    done: { label: 'Concluído', variant: 'default' },
    blocked: { label: 'Bloqueado', variant: 'destructive' },
  };
  const config = statusMap[status] || { label: status, variant: 'default' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}

export function TaskPriorityBadge({ priority }: { priority: string }) {
  const priorityMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    low: { label: 'Baixa', variant: 'secondary' },
    medium: { label: 'Média', variant: 'default' },
    high: { label: 'Alta', variant: 'default' },
    urgent: { label: 'Urgente', variant: 'destructive' },
  };
  const config = priorityMap[priority] || { label: priority, variant: 'default' };
  return <Badge variant={config.variant}>{config.label}</Badge>;
}
