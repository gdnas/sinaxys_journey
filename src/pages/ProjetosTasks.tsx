import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus, CheckCircle2, Clock, AlertCircle, XCircle, Calendar, User } from 'lucide-react';
import { useProjectAccess } from '@/hooks/useProjectAccess';
import useWorkItems from '@/hooks/useWorkItems';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { useCompany } from '@/lib/company';
import WorkItemForm from '@/components/work/WorkItemForm';

export default function ProjetosTasks() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { companyId } = useCompany();
  const { canView, canEdit, isLoading: projectLoading, project } = useProjectAccess(String(projectId ?? ''));
  const { taskList, loading, error, refetch } = useWorkItems(String(projectId ?? ''));
  const [showCreate, setShowCreate] = useState(false);
  const [taskData, setTaskData] = useState<any>(null);
  const [creating, setCreating] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');

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

  // Helper to get status icon
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="h-4 w-4 text-green-600" />;
      case 'in_progress':
        return <Clock className="h-4 w-4 text-blue-600" />;
      case 'blocked':
        return <XCircle className="h-4 w-4 text-red-600" />;
      default:
        return <AlertCircle className="h-4 w-4 text-yellow-600" />;
    }
  };

  // Helper to get status text
  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      backlog: 'Backlog',
      todo: 'A fazer',
      in_progress: 'Em progresso',
      review: 'Em revisão',
      done: 'Concluído',
      blocked: 'Bloqueado',
    };
    return statusMap[status] || status;
  };

  // Helper to get priority color
  const getPriorityColor = (priority: string) => {
    const colorMap: Record<string, string> = {
      low: 'bg-gray-100 text-gray-700',
      medium: 'bg-blue-100 text-blue-700',
      high: 'bg-orange-100 text-orange-700',
      urgent: 'bg-red-100 text-red-700',
    };
    return colorMap[priority] || 'bg-gray-100 text-gray-700';
  };

  // Helper to get priority text
  const getPriorityText = (priority: string) => {
    const priorityMap: Record<string, string> = {
      low: 'Baixa',
      medium: 'Média',
      high: 'Alta',
      urgent: 'Urgente',
    };
    return priorityMap[priority] || priority;
  };

  return (
    <div className="mx-auto max-w-6xl grid gap-6 pb-12">
      <Card className="p-6">
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
              <Button onClick={() => { setTaskData(null); setShowCreate(true); }}>
                <Plus className="mr-2 h-4 w-4" />
                Nova tarefa
              </Button>
            )}
          </div>
        </div>

        {/* Status Filter */}
        <div className="mt-4 flex items-center gap-2">
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
      </Card>

      {/* Tasks List */}
      <Card className="p-4">
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
          <div className="space-y-3">
            {filteredTasks.map((task) => (
              <Card key={task.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      {getStatusIcon(task.status)}
                      <h3 className="text-lg font-semibold">{task.title}</h3>
                      <span className={`text-xs px-2 py-1 rounded-full ${getPriorityColor(task.priority)}`}>
                        {getPriorityText(task.priority)}
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground mb-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {task.due_date ? new Date(task.due_date).toLocaleDateString('pt-BR') : 'Sem prazo'}
                      </span>
                      {task.assignee && (
                        <span className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {task.assignee?.name || task.assignee?.email || '—'}
                        </span>
                      )}
                    </div>

                    {task.description && (
                      <p className="text-sm text-muted-foreground line-clamp-2">{task.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {canEdit && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigate(`/app/projetos/${projectId}/tarefas/${task.id}/editar`);
                        }}
                      >
                        Editar
                      </Button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

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
    </div>
  );
}