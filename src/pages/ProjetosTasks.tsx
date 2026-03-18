import { useEffect, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, AlertCircle, LayoutList, LayoutGrid } from 'lucide-react';
import { useProjectAccess } from '@/hooks/useProjectAccess';
import useWorkItems from '@/hooks/useWorkItems';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/lib/company';
import WorkItemForm from '@/components/work/WorkItemForm';
import KanbanBoard from '@/components/work/KanbanBoard';
import KanbanTaskDialog from '@/components/work/KanbanTaskDialog';
import TaskListCard from '@/components/work/TaskListCard';
import { KanbanTask } from '@/hooks/useKanban';
import { useToast } from '@/hooks/use-toast';

type ViewMode = 'list' | 'kanban';

export default function ProjetosTasks() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { companyId } = useCompany();
  const { toast } = useToast();
  const { canView, canEdit, isLoading: projectLoading, project } = useProjectAccess(String(projectId ?? ''));
  const { taskList, loading, error, refetch } = useWorkItems(String(projectId ?? ''));
  const [showCreate, setShowCreate] = useState(false);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [pendingCommentId, setPendingCommentId] = useState<string | null>(null);

  // Handle commentId from URL to open task dialog
  useEffect(() => {
    const commentId = searchParams.get('commentId');
    const taskId = searchParams.get('taskId');

    if (taskId) {
      setPendingCommentId(commentId);
      setSelectedTaskId(taskId);
      // Clean the URL parameters
      navigate(`/app/projetos/${projectId}/tarefas`, { replace: true });
    }
  }, [searchParams, projectId, navigate]);

  // Store commentId to pass to dialog
  const urlCommentId = searchParams.get('commentId');

  const tasksWithNames = taskList; // already assembled by hook

  const filteredTasks = statusFilter === 'all'
    ? tasksWithNames
    : tasksWithNames.filter(t => t.status === statusFilter);

  const taskCounts = {
    all: tasksWithNames.length,
    todo: tasksWithNames.filter(t => t.status === 'todo').length,
    in_progress: tasksWithNames.filter(t => t.status === 'in_progress').length,
    done: tasksWithNames.filter(t => t.status === 'done').length,
  };

  // Convert tasks to KanbanTask format
  const kanbanTasks: KanbanTask[] = tasksWithNames.map(task => ({
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    assignee_user_id: task.assignee_user_id,
    due_date: task.due_date,
    start_date: task.start_date,
    assignee: task.assignee,
  }));

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId);
  };

  const handleEditTask = (taskId: string) => {
    navigate(`/app/projetos/${projectId}/tarefas/${taskId}/editar`);
  };

  const handleChangeAssignee = (taskId: string) => {
    setSelectedTaskId(taskId);
    // Modal will open and user can change assignee there
  };

  const handleCreateSubtask = (taskId: string) => {
    setSelectedTaskId(taskId);
    toast({
      title: 'Funcionalidade em desenvolvimento',
      description: 'Subtarefas serão implementadas em breve',
    });
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Tem certeza que deseja excluir esta tarefa?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('work_items')
        .delete()
        .eq('id', taskId);

      if (error) throw error;

      toast({ title: 'Tarefa excluída com sucesso' });
      refetch();
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Erro ao excluir tarefa',
        variant: 'destructive',
      });
    }
  };

  const handleToggleTaskDone = async (taskId: string) => {
    try {
      // Find the task and determine new status
      const task = taskList.find(t => t.id === taskId);
      if (!task) return;

      const newStatus = task.status === 'done' ? 'todo' : 'done';
      const completedAt = newStatus === 'done' ? new Date().toISOString() : null;

      const { error } = await supabase
        .from('work_items')
        .update({ 
          status: newStatus,
          completed_at: completedAt,
          updated_at: new Date().toISOString()
        })
        .eq('id', taskId);

      if (error) throw error;

      toast({ 
        title: newStatus === 'done' ? 'Tarefa concluída!' : 'Tarefa reaberta',
        description: newStatus === 'done' ? 'Ótimo trabalho!' : 'Tarefa movida para pendente'
      });
      refetch();
    } catch (err: any) {
      toast({
        title: 'Erro',
        description: err.message || 'Erro ao atualizar tarefa',
        variant: 'destructive',
      });
    }
  };

  if (projectLoading) return <div className="p-6">Carregando...</div>;
  if (!canView || !project) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-8">
        <div className="text-center">
          <AlertCircle className="mx-auto mb-4 h-16 w-16 text-red-500" />
          <h1 className="text-2xl font-bold text-red-600">Acesso negado</h1>
          <p className="mt-2 text-muted-foreground">
            Você não tem permissão para acessar este projeto.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header Card */}
      <Card className="p-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{project.name} - Tarefas</h1>
            <p className="mt-2 text-sm text-muted-foreground">Gerencie as tarefas deste projeto</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/app/projetos/${projectId}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            {canEdit && (
              <Button onClick={() => setShowCreate(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nova tarefa
              </Button>
            )}
          </div>
        </div>

        {/* View Toggle and Status Filter */}
        <div className="mt-4 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Visualização:</span>
            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === 'kanban' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-r-none"
                onClick={() => setViewMode('kanban')}
              >
                <LayoutGrid className="mr-2 h-4 w-4" />
                Kanban
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                className="rounded-l-none"
                onClick={() => setViewMode('list')}
              >
                <LayoutList className="mr-2 h-4 w-4" />
                Lista
              </Button>
            </div>
          </div>

          {viewMode === 'list' && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Filtrar por status:</span>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas ({taskCounts.all})</SelectItem>
                  <SelectItem value="todo">A fazer ({taskCounts.todo})</SelectItem>
                  <SelectItem value="in_progress">Em progresso ({taskCounts.in_progress})</SelectItem>
                  <SelectItem value="done">Concluídas ({taskCounts.done})</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </Card>

      {/* Content */}
      <div className="flex-1 mt-4 overflow-hidden">
        {viewMode === 'kanban' ? (
          <KanbanBoard
            projectId={String(projectId)}
            projectName={project.name}
            tasks={kanbanTasks}
            loading={loading}
            canEdit={canEdit}
            onRefresh={refetch}
            onCreateTask={() => setShowCreate(true)}
          />
        ) : (
          <Card className="p-4 h-full overflow-auto">
            <div className="flex items-center justify-between mb-4">
              <div className="text-sm text-muted-foreground">{filteredTasks.length} tarefas</div>
            </div>

            {loading ? (
              <div className="text-center py-8">Carregando tarefas...</div>
            ) : error ? (
              <div className="text-center py-8 text-red-600">Erro: {error}</div>
            ) : filteredTasks.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhuma tarefa encontrada{statusFilter !== 'all' && ' com este filtro'}
              </div>
            ) : (
              <div className="space-y-2">
                {filteredTasks.map((task) => (
                  <TaskListCard
                    key={task.id}
                    task={task}
                    projectId={String(projectId)}
                    canEdit={canEdit}
                    onTaskClick={handleTaskClick}
                    onEdit={handleEditTask}
                    onChangeAssignee={handleChangeAssignee}
                    onCreateSubtask={handleCreateSubtask}
                    onDelete={handleDeleteTask}
                    onToggleDone={handleToggleTaskDone}
                  />
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Create Task Dialog */}
      {showCreate && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/30 p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-3xl p-6" onClick={(e) => e.stopPropagation()}>
            <Card className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">Nova tarefa</h3>
              </div>
              <WorkItemForm
                projectId={String(projectId)}
                onSaved={(wi) => { setShowCreate(false); refetch(); }}
                onCancel={() => setShowCreate(false)}
              />
            </Card>
          </div>
        </div>
      )}

      {/* Task View Dialog */}
      <KanbanTaskDialog
        taskId={selectedTaskId ?? ''}
        projectId={String(projectId)}
        open={!!selectedTaskId}
        onClose={() => {
          setSelectedTaskId(null);
          setPendingCommentId(null);
        }}
        onRefresh={refetch}
        commentId={pendingCommentId ?? undefined}
      />
    </div>
  );
}