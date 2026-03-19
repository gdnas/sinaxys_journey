import { Badge } from '@/components/ui/badge';
import { getWorkItemStatusLabel, getWorkItemStatusVariant } from '@/lib/workItemConstants';

export default function WorkItemStatusBadge({ status }: { status: string }) {
  const label = getWorkItemStatusLabel(status);
  const variant = getWorkItemStatusVariant(status);

  return <Badge variant={variant}>{label}</Badge>;
}