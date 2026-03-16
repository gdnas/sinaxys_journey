import { Badge } from '@/components/ui/badge';

export default function WorkItemPriorityBadge({ priority }: { priority: string }) {
  const priorityMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
    low: { label: 'Baixa', variant: 'secondary' },
    medium: { label: 'Média', variant: 'default' },
    high: { label: 'Alta', variant: 'default' },
    urgent: { label: 'Urgente', variant: 'destructive' },
  };

  const config = priorityMap[priority] || { label: priority, variant: 'default' };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
