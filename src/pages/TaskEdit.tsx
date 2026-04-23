import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ExternalLink, MessageSquare, ListChecks, History, Save, CheckCircle2, Circle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useWorkItemAccess } from '@/hooks/useWorkItemAccess';
import AccessDenied from '@/components/AccessDenied';
import WorkItemForm from '@/components/work/WorkItemForm';
import TaskStatusHistory from '@/components/work/TaskStatusHistory';
import { WorkItemComments } from '@/components/work/WorkItemComments';
import { WorkItemSubtasks } from '@/components/work/WorkItemSubtasks';
import { WorkItemTimeline } from '@/components/work/WorkItemTimeline';
import WorkItemPriorityBadge from '@/components/work/WorkItemPriorityBadge';
import WorkItemStatusBadge from '@/components/work/WorkItemStatusBadge';

export default function TaskEdit() {
  const { projectId, taskId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canView, canEdit, isLoading, workItem } = useWorkItemAccess(String(taskId ?? ''));
  const [savingStatus, setSavingStatus] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const projectTaskListPath = useMemo(() => {
    if (!projectId) return '/app/projetos';
    return `/app/projetos/${projectId}/tarefas`;
  }, [projectId]);

  const isDone = workItem?.status === 'done' || workItem?.status === 'DONE';

  const handleStatusToggle = async () => {
    if (!workItem) return;

    setSavingStatus(true);
    const nextStatus = isDone ? 'todo' : 'done';

    const { error } = await supabase
      .from('work_items')
      .update({ status: nextStatus })
      .eq('id', workItem.id);

    setSavingStatus(false);

    if (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar o status da tarefa.',
        variant: 'destructive',
      });
      return;
    }

    toast({
      title: 'Status atualizado',
      description: `A tarefa foi marcada como ${nextStatus === 'done' ? 'concluída' : 'em andamento'}.`,
    });

    setRefreshKey((value) => value + 1);
  };

  const handleSaved = () => {
    setRefreshKey((value) => value + 1);
    toast({
      title: 'Tarefa atualizada',
      description: 'As alterações foram salvas com sucesso.',
    });
  };

  if (isLoading) return <div className="p-6">Carregando...</div>;
  if (!canView || !workItem) return <AccessDenied />;

  return (
    <div className="mx-auto max-w-6xl p-4 sm:p-6 space-y-6">
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <WorkItemStatusBadge status={workItem.status} />
              <WorkItemPriorityBadge priority={workItem.priority} />
              {isDone ? (
                <Badge className="bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/15">
                  <CheckCircle2 className="mr-1 h-3.5 w-3.5" />
                  Concluída
                </Badge>
              ) : (
                <Badge className="bg-sky-500/15 text-sky-300 hover:bg-sky-500/15">
                  <Circle className="mr-1 h-3.5 w-3.5" />
                  Em aberto
                </Badge>
              )}
            </div>

            <div>
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{workItem.title}</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Veja e gerencie tudo sobre esta tarefa em um só lugar.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate(projectTaskListPath)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button variant="outline" onClick={() => navigate(`/app/projetos/${projectId}/kanban`)}>
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir kanban
            </Button>
            <Button onClick={handleStatusToggle} disabled={savingStatus}>
              {isDone ? 'Reabrir tarefa' : 'Marcar como concluída'}
            </Button>
          </div>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_0.9fr]">
        <Card className="p-4 sm:p-6">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-semibold">Editar tarefa</h2>
              <p className="text-sm text-muted-foreground">Atualize os dados principais da tarefa.</p>
            </div>
          </div>

          {canEdit ? (
            <WorkItemForm
              workItem={workItem}
              projectId={String(projectId)}
              onSaved={handleSaved}
              onCancel={() => navigate(projectTaskListPath)}
            />
          ) : (
            <AccessDenied message="Você não tem permissão para editar esta tarefa." />
          )}
        </Card>

        <div className="space-y-6">
          <Card className="p-4 sm:p-6">
            <h3 className="text-sm font-semibold text-muted-foreground">Resumo</h3>
            <div className="mt-4 grid gap-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Projeto</span>
                <span className="font-medium text-right">{workItem.project_name ?? '—'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Responsável</span>
                <span className="font-medium text-right">{workItem.assignee?.name ?? 'Sem responsável'}</span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Prazo</span>
                <span className="font-medium text-right">
                  {workItem.due_date ? new Date(workItem.due_date).toLocaleDateString('pt-BR') : '—'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-muted-foreground">Início</span>
                <span className="font-medium text-right">
                  {workItem.start_date ? new Date(workItem.start_date).toLocaleDateString('pt-BR') : '—'}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-4 sm:p-6">
            <h3 className="text-sm font-semibold text-muted-foreground">Ações rápidas</h3>
            <div className="mt-4 flex flex-col gap-2">
              <Button variant="outline" className="justify-start" onClick={handleStatusToggle} disabled={savingStatus}>
                <CheckCircle2 className="mr-2 h-4 w-4" />
                {isDone ? 'Reabrir tarefa' : 'Concluir tarefa'}
              </Button>
              <Button variant="outline" className="justify-start" onClick={() => setRefreshKey((value) => value + 1)}>
                <History className="mr-2 h-4 w-4" />
                Atualizar histórico
              </Button>
            </div>
          </Card>
        </div>
      </div>

      <Card className="p-4 sm:p-6">
        <Tabs defaultValue="subtasks" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="subtasks">
              <ListChecks className="mr-2 h-4 w-4" />
              Subtarefas
            </TabsTrigger>
            <TabsTrigger value="comments">
              <MessageSquare className="mr-2 h-4 w-4" />
              Comentários
            </TabsTrigger>
            <TabsTrigger value="timeline">
              <History className="mr-2 h-4 w-4" />
              Histórico
            </TabsTrigger>
          </TabsList>

          <TabsContent value="subtasks" className="mt-4">
            <WorkItemSubtasks
              workItemId={String(taskId ?? '')}
              tenantId={String(workItem.tenant_id ?? '')}
              onUpdate={() => setRefreshKey((value) => value + 1)}
            />
          </TabsContent>

          <TabsContent value="comments" className="mt-4">
            <WorkItemComments
              workItemId={String(taskId ?? '')}
              onUpdate={() => setRefreshKey((value) => value + 1)}
            />
          </TabsContent>

          <TabsContent value="timeline" className="mt-4">
            <WorkItemTimeline
              workItemId={String(taskId ?? '')}
              refreshTrigger={refreshKey}
            />
          </TabsContent>
        </Tabs>
      </Card>

      <Card className="p-4 sm:p-6">
        <TaskStatusHistory workItemId={String(taskId ?? '')} />
      </Card>
    </div>
  );
}