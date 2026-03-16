import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import WorkItemStatusBadge from './WorkItemStatusBadge';
import WorkItemPriorityBadge from './WorkItemPriorityBadge';
import { MoreVertical } from 'lucide-react';

export default function WorkItemCard({ workItem, projectId }: { workItem: any; projectId: string }) {
  return (
    <Card className="p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-2">
            <h3 className="text-lg font-semibold truncate">{workItem.title}</h3>
            <WorkItemStatusBadge status={workItem.status} />
            <WorkItemPriorityBadge priority={workItem.priority} />
          </div>
          {workItem.description && (
            <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{workItem.description}</p>
          )}
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            {workItem.assignee_user_id && <span>Responsavel: {workItem.assignee_user_id}</span>}
            {workItem.due_date && <span>Prazo: {workItem.due_date}</span>}
            {workItem.start_date && <span>Inicio: {workItem.start_date}</span>}
            {workItem.parent_id && <span>Pai: {workItem.parent_id}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link to={`/app/projetos/${projectId}/tarefas/${workItem.id}`}>
            <Button variant="ghost" size="icon">
              <MoreVertical className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
}
