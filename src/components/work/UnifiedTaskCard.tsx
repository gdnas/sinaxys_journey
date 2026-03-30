import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import WorkItemStatusBadge from './WorkItemStatusBadge';
import WorkItemPriorityBadge from './WorkItemPriorityBadge';
import { CheckCircle2, Circle, LayoutDashboard, Target, ChevronRight, Calendar, User } from 'lucide-react';
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
  const isOkr = !!workItem.key_result_id;

  // Determinar cor de destaque baseada no contexto
  const contextColor = isProject ? 'text-blue-600' : 'text-purple-600';
  const contextIcon = isProject ? <LayoutDashboard className="h-4 w-4" /> : <Target className="h-4 w-4" />;

  // Determinar link de navegação
  const navigateTo = isProject
    ? `/app/projetos/${workItem.project_id}/kanban`
    : `/okr/deliverable/${workItem.deliverable_id}`;

  // Formatar data de vencimento
  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    return format(date, 'dd/MM/yyyy');
  };

  // Determinar se está atrasado
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
        {/* Checkbox/Status Icon */}
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

        {/* Task Content */}
        <div className="flex-1 min-w-0">
          {/* Header: Title + Badges */}
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap mb-1">
                <h3 className={`text-base font-semibold ${isDone ? 'line-through text-muted-foreground' : ''}`}>
                  {workItem.title}
                </h3>
                <WorkItemStatusBadge status={workItem.status} />
                <WorkItemPriorityBadge priority={workItem.priority} />
              </div>

              {/* Context Badge */}
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

            {/* Navigate Button */}
            <Link to={navigateTo}>
              <Button variant="ghost" size="icon" className="flex-shrink-0">
                <ChevronRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>

          {/* Description */}
          {workItem.description && (
            <p className={`text-sm mb-3 ${isDone ? 'line-through text-muted-foreground' : 'text-muted-foreground'} line-clamp-2`}>
              {workItem.description}
            </p>
          )}

          {/* Footer: Dates + Info */}
          <div className="flex items-center gap-4 text-xs text-muted-foreground flex-wrap">
            {/* Due Date */}
            {workItem.due_date && (
              <div className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-medium' : ''}`}>
                <Calendar className="h-3 w-3" />
                <span>
                  {isOverdue && 'Atrasado: '}
                  {formatDate(workItem.due_date)}
                </span>
              </div>
            )}

            {/* Cycle (for OKRs) */}
            {workItem.cycle_label && (
              <div className="flex items-center gap-1">
                <Target className="h-3 w-3" />
                <span>{workItem.cycle_label}</span>
              </div>
            )}

            {/* Start Date */}
            {workItem.start_date && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>Início: {formatDate(workItem.start_date)}</span>
              </div>
            )}

            {/* Estimate */}
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
