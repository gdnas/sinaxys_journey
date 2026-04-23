import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Filter, Calendar, AlertCircle, LayoutDashboard, Target } from "lucide-react";
import { TimeFilter, ContextFilter, useUnifiedWorkItemCounts } from "@/hooks/useUnifiedWorkItems";

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
  const { counts } = useUnifiedWorkItemCounts(userId);

  const timeFilters: Array<{ value: TimeFilter; label: string; icon: any; count?: number }> = [
    { value: "all", label: "Todas", icon: Filter },
    { value: "today", label: "Hoje", icon: Calendar, count: counts.today },
    { value: "this_week", label: "Esta semana", icon: Calendar, count: counts.thisWeek },
    { value: "overdue", label: "Atrasadas", icon: AlertCircle, count: counts.overdue },
  ];

  const contextFilters: Array<{ value: ContextFilter; label: string; icon: any; count?: number }> = [
    { value: "all", label: "Todos", icon: Filter },
    { value: "projects", label: "Projetos", icon: LayoutDashboard, count: counts.projects },
    { value: "okrs", label: "OKRs", icon: Target, count: counts.okrs },
  ];

  const renderFilterGroup = (
    title: string,
    items: Array<{ value: string; label: string; icon: any; count?: number }>,
    value: string,
    onChange: (filter: any) => void,
  ) => {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm">
        <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          <Filter className="h-3.5 w-3.5" />
          <span>{title}</span>
        </div>

        <div className="flex flex-wrap gap-2">
          {items.map((item) => {
            const Icon = item.icon;
            const active = value === item.value;

            return (
              <Button
                key={item.value}
                type="button"
                variant={active ? "default" : "outline"}
                size="sm"
                onClick={() => onChange(item.value)}
                className={[
                  "h-9 rounded-full px-3 text-sm transition-all",
                  active
                    ? "bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                    : "border-white/10 bg-white/5 text-[color:var(--sinaxys-ink)] hover:bg-white/10 hover:text-[color:var(--sinaxys-ink)]",
                ].join(" ")}
              >
                <Icon className="mr-2 h-4 w-4" />
                <span>{item.label}</span>
                {item.count !== undefined && (
                  <Badge
                    variant="secondary"
                    className={[
                      "ml-2 h-5 min-w-5 rounded-full px-1.5 text-[10px] font-semibold",
                      active
                        ? "bg-white/20 text-white"
                        : "bg-white/10 text-[color:var(--sinaxys-ink)]",
                    ].join(" ")}
                  >
                    {item.count}
                  </Badge>
                )}
              </Button>
            );
          })}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-3">
      {renderFilterGroup("Período", timeFilters, timeFilter, onTimeFilterChange)}
      {renderFilterGroup("Origem", contextFilters, contextFilter, onContextFilterChange)}
    </div>
  );
}