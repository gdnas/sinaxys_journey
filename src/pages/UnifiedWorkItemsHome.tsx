import { useState } from 'react';
import { useAuth } from '@/lib/auth';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import UnifiedTaskCard from '@/components/work/UnifiedTaskCard';
import TaskFilters from '@/components/work/TaskFilters';
import { useUnifiedWorkItems, TimeFilter, ContextFilter, useUnifiedWorkItemCounts } from '@/hooks/useUnifiedWorkItems';
import { RefreshCw, Inbox, CheckCircle2, AlertTriangle, Calendar, Target, LayoutDashboard } from 'lucide-react';
import { format, startOfWeek, endOfWeek, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function UnifiedWorkItemsHome() {
  const { user } = useAuth();
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [contextFilter, setContextFilter] = useState<ContextFilter>('all');

  const { workItems, isLoading, error, refetch, updateWorkItemStatus } = useUnifiedWorkItems({
    userId: user?.id || '',
    timeFilter,
    contextFilter,
  });

  const { counts } = useUnifiedWorkItemCounts(user?.id || '');

  // Obter informações de data atual
  const today = new Date();
  const weekStart = startOfWeek(today, { locale: ptBR });
  const weekEnd = endOfWeek(today, { locale: ptBR });

  // Agrupar work items por categoria para exibição
  const overdueItems = workItems.filter(item => item.is_overdue && !item.is_today);
  const todayItems = workItems.filter(item => item.is_today);
  const thisWeekItems = workItems.filter(item => item.is_this_week && !item.is_today && !item.is_overdue);
  const otherItems = workItems.filter(item => !item.is_today && !item.is_overdue && !item.is_this_week);

  // Mensagem de filtro ativo
  const getFilterMessage = () => {
    const timeMessages: Record<TimeFilter, string> = {
      all: 'Todas as tarefas',
      today: 'Tarefas para hoje',
      this_week: 'Tarefas desta semana',
      overdue: 'Tarefas atrasadas',
    };

    const contextMessages: Record<ContextFilter, string> = {
      all: '',
      projects: ' - Projetos',
      okrs: ' - OKRs',
    };

    return timeMessages[timeFilter] + contextMessages[contextFilter];
  };

  const getEmptyState = () => {
    if (contextFilter === 'projects') {
      return {
        icon: <LayoutDashboard className="h-12 w-12 text-muted-foreground/50" />,
        title: 'Nenhum projeto encontrado',
        description: 'Você ainda não tem tarefas de projetos neste período.',
      };
    }

    if (contextFilter === 'okrs') {
      return {
        icon: <Target className="h-12 w-12 text-muted-foreground/50" />,
        title: 'Nenhum OKR encontrado',
        description: 'Você ainda não tem tarefas de OKRs neste período.',
      };
    }

    return {
      icon: <Inbox className="h-12 w-12 text-muted-foreground/50" />,
      title: 'Nenhuma tarefa encontrada',
      description: 'Você não tem tarefas pendentes neste período.',
    };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Minhas Tarefas</h1>
          <p className="text-muted-foreground mt-1">
            {format(today, "EEEE, d 'de' MMMM 'de' yyyy", { locale: ptBR })}
          </p>
        </div>
        <Button
          variant="outline"
          size="icon"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-blue-100 p-2">
              <Inbox className="h-5 w-5 text-blue-700" />
            </div>
            <div>
              <div className="text-2xl font-semibold">{counts.total}</div>
              <div className="text-sm text-muted-foreground">Total</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-red-100 p-2">
              <AlertTriangle className="h-5 w-5 text-red-700" />
            </div>
            <div>
              <div className="text-2xl font-semibold">{counts.overdue}</div>
              <div className="text-sm text-muted-foreground">Atrasadas</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-orange-100 p-2">
              <Calendar className="h-5 w-5 text-orange-700" />
            </div>
            <div>
              <div className="text-2xl font-semibold">{counts.today}</div>
              <div className="text-sm text-muted-foreground">Hoje</div>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-lg bg-green-100 p-2">
              <Target className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <div className="text-2xl font-semibold">{counts.thisWeek}</div>
              <div className="text-sm text-muted-foreground">Esta Semana</div>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <TaskFilters
        timeFilter={timeFilter}
        contextFilter={contextFilter}
        onTimeFilterChange={setTimeFilter}
        onContextFilterChange={setContextFilter}
        userId={user?.id || ''}
      />

      {/* Task List */}
      <div className="space-y-6">
        {/* Loading State */}
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {/* Error State */}
        {error && (
          <Card className="p-6 text-center">
            <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-3" />
            <h3 className="font-semibold text-red-600 mb-2">Erro ao carregar tarefas</h3>
            <p className="text-sm text-muted-foreground mb-4">
              {error.message}
            </p>
            <Button onClick={() => refetch()} variant="outline">
              Tentar novamente
            </Button>
          </Card>
        )}

        {/* Empty State */}
        {!isLoading && !error && workItems.length === 0 && (
          <Card className="p-12 text-center">
            {getEmptyState().icon}
            <h3 className="text-lg font-semibold mt-4 mb-2">
              {getEmptyState().title}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {getEmptyState().description}
            </p>
            <div className="flex gap-3 justify-center">
              {contextFilter !== 'all' && (
                <Button
                  variant="outline"
                  onClick={() => setContextFilter('all')}
                >
                  Mostrar todas as tarefas
                </Button>
              )}
              <Button
                variant="outline"
                onClick={() => {
                  setTimeFilter('all');
                  setContextFilter('all');
                }}
              >
                Limpar filtros
              </Button>
            </div>
          </Card>
        )}

        {/* Task Sections */}
        {!isLoading && !error && workItems.length > 0 && (
          <>
            {/* Atrasadas */}
            {overdueItems.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  <h2 className="text-lg font-semibold text-red-600">
                    Atrasadas ({overdueItems.length})
                  </h2>
                </div>
                <div className="space-y-3">
                  {overdueItems.map((item) => (
                    <UnifiedTaskCard
                      key={item.id}
                      workItem={item}
                      onStatusToggle={updateWorkItemStatus}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Hoje */}
            {todayItems.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-orange-600" />
                  <h2 className="text-lg font-semibold text-orange-600">
                    Para Hoje ({todayItems.length})
                  </h2>
                </div>
                <div className="space-y-3">
                  {todayItems.map((item) => (
                    <UnifiedTaskCard
                      key={item.id}
                      workItem={item}
                      onStatusToggle={updateWorkItemStatus}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Esta Semana */}
            {thisWeekItems.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-blue-600">
                    Esta Semana ({thisWeekItems.length})
                  </h2>
                </div>
                <div className="space-y-3">
                  {thisWeekItems.map((item) => (
                    <UnifiedTaskCard
                      key={item.id}
                      workItem={item}
                      onStatusToggle={updateWorkItemStatus}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Outras */}
            {otherItems.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Inbox className="h-5 w-5 text-muted-foreground" />
                  <h2 className="text-lg font-semibold text-muted-foreground">
                    Outras ({otherItems.length})
                  </h2>
                </div>
                <div className="space-y-3">
                  {otherItems.map((item) => (
                    <UnifiedTaskCard
                      key={item.id}
                      workItem={item}
                      onStatusToggle={updateWorkItemStatus}
                    />
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
