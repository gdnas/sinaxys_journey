import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Filter, Calendar, AlertCircle, LayoutDashboard, Target } from 'lucide-react';
import { TimeFilter, ContextFilter, useUnifiedWorkItemCounts } from '@/hooks/useUnifiedWorkItems';

interface TaskFiltersProps {
  timeFilter: TimeFilter;
  contextFilter: ContextFilter;
  onTimeFilterChange: (filter: TimeFilter) => void;
  onContextFilterChange: (filter: ContextFilter) => void;
  userId: string;
}

export default function TaskFilters({
  timeFilter,
  contextFilter,
  onTimeFilterChange,
  onContextFilterChange,
  userId,
}: TaskFiltersProps) {
  const { counts, isLoading: isLoadingCounts } = useUnifiedWorkItemCounts(userId);

  const timeFilters: Array<{ value: TimeFilter; label: string; icon: any; count?: number }> = [
    { value: 'all', label: 'Todas', icon: Filter },
    { value: 'today', label: 'Hoje', icon: Calendar, count: counts.today },
    { value: 'this_week', label: 'Esta Semana', icon: Calendar, count: counts.thisWeek },
    { value: 'overdue', label: 'Atrasadas', icon: AlertCircle, count: counts.overdue },
  ];

  const contextFilters: Array<{ value: ContextFilter; label: string; icon: any; count?: number }> = [
    { value: 'all', label: 'Todos', icon: Filter },
    { value: 'projects', label: 'Projetos', icon: LayoutDashboard, count: counts.projects },
    { value: 'okrs', label: 'OKRs', icon: Target, count: counts.okrs },
  ];

  return (
    <div className="space-y-4">
      {/* Time Filters */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Tabs value={timeFilter} onValueChange={(v) => onTimeFilterChange(v as TimeFilter)}>
          <TabsList className="bg-muted/50">
            {timeFilters.map((filter) => {
              const Icon = filter.icon;
              return (
                <TabsTrigger key={filter.value} value={filter.value} className="relative">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span>{filter.label}</span>
                    {filter.count !== undefined && (
                      <Badge variant="secondary" className="ml-1">
                        {filter.count}
                      </Badge>
                    )}
                  </div>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>

      {/* Context Filters */}
      <div className="flex items-center gap-3">
        <Filter className="h-4 w-4 text-muted-foreground" />
        <Tabs value={contextFilter} onValueChange={(v) => onContextFilterChange(v as ContextFilter)}>
          <TabsList className="bg-muted/50">
            {contextFilters.map((filter) => {
              const Icon = filter.icon;
              return (
                <TabsTrigger key={filter.value} value={filter.value} className="relative">
                  <div className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span>{filter.label}</span>
                    {filter.count !== undefined && (
                      <Badge variant="secondary" className="ml-1">
                        {filter.count}
                      </Badge>
                    )}
                  </div>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </Tabs>
      </div>
    </div>
  );
}
