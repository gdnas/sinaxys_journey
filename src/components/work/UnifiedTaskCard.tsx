import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import WorkItemStatusBadge from './WorkItemStatusBadge';
import WorkItemPriorityBadge from './WorkItemPriorityBadge';
import { CheckCircle2, Circle, LayoutDashboard, Target, ChevronRight, Calendar } from 'lucide-react';
import { format } from 'date-fns';
import { UnifiedWorkItem } from '@/hooks/useUnifiedWorkItems';

interface UnifiedTaskCardProps {
  workItem: UnifiedWorkItem;
  onStatusToggle: (workItemId: string, newStatus: string) => Promise<void>;
  isUpdating?: boolean;
}

export default function UnifiedTaskCard({ workItem, onStatusToggle, isUpdating }: UnifiedTaskCardProps) {
  const isDone = workItem.status === 'DONE';
  const isProject = !!workItem.project_id;

  const contextColor = isProject ? 'text-blue-600' : 'text-purple-600';
  const contextIcon = isProject ? <LayoutDashboard className="h-4 w-4" /> : <Target className="h-4 w-4" />;

  const navigateTo = isProject && workItem.project_id
    ? `/app/projetos/${workItem.project_id}/tarefas/${workItem.id}/editar`
    : workItem.deliverable_id
      ? `/okr/entregaveis/${workItem.deliverable_id}`
      : workItem.key_result_id
        ? `/okr/objetivos/${workItem.key_result_id}`
        : '/app';

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return format(date, 'dd/MM/yyyy');
  };

  const isOverdue = workItem.is_overdue && !isDone;

  const handleStatusToggle = async () => {
    const newStatus = isDone ? 'TODO' : 'DONE';
    await onStatusToggle(workItem.id, newStatus);
  };

  return (
    <Card className={`p-4 hover:shadow-md transition-all border-l-4 ${
      isOverdue ? 'border-l-red-500' : isDone ? 'border-l-green-500' : 'border-l-blue-500'
    }`}>
      <div className="flex items-start gap-3">
        <button
          onClick={handleStatusToggle}
          disabled={isUpdating}
          className="mt-0.5 flex-shrink-0 disabled:opacity-50 transition-colors hover:opacity-80"
        >
          {isDone ? (
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          ) : (
            <Circle className="h-5 w-5 text-muted-foreground" />
          )}
        </button>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className={`text-base font-semibold ${isDone ? 'line-through text-muted-foreground' : ''}`}>
                  {workItem.title}
                </h3>
                <WorkItemStatusBadge status={workItem.status} />
                <WorkItemPriorityBadge priority={workItem.priority} />
              </div>

              {(workItem.project_name || workItem.objective_title) && (
                <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  {contextIcon}
                  <span className={contextColor}>
                    {isProject ? (
                      <span className="font-medium">{workItem.project_name}</span>
                    ) : (
                      <span>
                        {workItem.deliverable_title && <span className="font-medium">{workItem.deliverable_title}</span>}
                        {workItem.deliverable_title && workItem.key_result_title && ' • '}
                        {workItem.key_result_title && <span>{workItem.key_result_title}</span>}
                      </span>
                    )}
                  </span>
                </div>
              )}
            </div>

            <Button asChild variant="ghost" size="icon" className="flex-shrink-0">
              <Link to={navigateTo}>
                <ChevronRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          {workItem.description && (
            <p className={`text-sm mb-3 ${isDone ? 'line-through text-muted-foreground' : 'text-muted-foreground'} line-clamp-2`}>
              {workItem.description}
            </p>
          )}

          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            {workItem.due_date && (
              <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                <Calendar className="h-3 w-3" />
                <span>
                  {isOverdue && 'Atrasado: '}
                  {formatDate(workItem.due_date)}
                </span>
              </div>
            )}

            {workItem.cycle_label && (
              <div className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                <span>{workItem.cycle_label}</span>
              </div>
            )}

            {workItem.start_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Início: {formatDate(workItem.start_date)}</span>
              </div>
            )}

            {workItem.estimate_minutes && (
              <div className="flex items-center gap-1">
                <span>⏱️ {Math.round(workItem.estimate_minutes / 60)}h</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}