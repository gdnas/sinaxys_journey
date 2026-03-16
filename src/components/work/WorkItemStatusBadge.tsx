import { Badge } from '@/components/ui/badge';

export default function WorkItemStatusBadge({ status }: { status: string }) {
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
