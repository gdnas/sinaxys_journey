import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useProjectAccess } from '@/hooks/useProjectAccess';
import { useWorkItems } from '@/hooks/useWorkItems';
import { useState } from 'react';

export default function ProjetosTasks() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { canView, canEdit, isLoading: projectLoading, project } = useProjectAccess(String(projectId ?? ''));
  const { taskList, loading, error, refetch } = useWorkItems(String(projectId ?? ''));
  const [showCreate, setShowCreate] = useState(false);
  const [taskData, setTaskData] = useState<any>(null);
  const [creating, setCreating] = useState(false);

  if (projectLoading) return <div className="p-6">Carregando...</div>;
  if (!canView || !project) return <AccessDenied />;

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
              <Button onClick={() => setTaskData(null); setShowCreate(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Nova tarefa
              </Button>
            )}
          </div>
        </div>

        <Card className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm text-muted-foreground">{taskList.length} tarefas</div>
          </div>

          {loading ? (
            <div className="text-center py-8">Carregando tarefas...</div>
          ) : error ? (
            <div className="text-center py-8 text-red-600">Erro: {error}</div>
          ) : taskList.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              Nenhuma tarefa encontrada
            </div>
          ) : (
            <div className="grid gap-4">
              {taskList.map((task) => (
                <Card key={task.id} className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-semibold">{task.title}</h3>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-muted-foreground">
                          {task.status === 'done' ? 'Concluido' : task.status}
                        </span>
                      </div>
                      {task.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{task.description}</p>
                      )}
                      <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                        {task.assignee_user_id && <span>Responsavel: {task.assignee_user_id}</span>}
                        {task.due_date && <span>Prazo: {task.due_date}</span>}
                        {task.start_date && <span>Início: {task.start_date}</span>}
                        {task.parent_id && <span>Pai: {task.parent_id}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          navigate(`/app/projetos/${projectId}/tarefas/${task.id}/editar`);
                        }}
                      >
                        Editar
                      </Button>
                    </div>
                  </Card>
              ))}
            </div>
          )}
        </Card>
    </div>
  );
}
