import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Plus } from 'lucide-react';
import { useProjectAccess } from '@/hooks/useProjectAccess';
import useWorkItems from '@/hooks/useWorkItems';
import KanbanBoard from '@/components/work/KanbanBoard';
import { KanbanTask } from '@/hooks/useKanban';
import WorkItemForm from '@/components/work/WorkItemForm';
import { useState } from 'react';

export default function ProjetosKanban() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { canView, isLoading: projectLoading, project } = useProjectAccess(String(projectId ?? ''));
  const { taskList, loading, error, refetch } = useWorkItems(String(projectId ?? ''));
  const [showCreate, setShowCreate] = useState(false);

  if (projectLoading) return <div className="p-6">Carregando...</div>;
  if (!canView || !project) {
    return (
      <div className="flex min-h-[400px] items-center justify-center p-8">
        <div className="text-center">
          <p className="text-muted-foreground">
            Você não tem permissão para acessar este projeto.
          </p>
        </div>
      </div>
    );
  }

  // Convert tasks to KanbanTask format
  const kanbanTasks: KanbanTask[] = taskList.map(task => ({
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

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <Card className="p-6 flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">{project.name} - Kanban</h1>
            <p className="mt-2 text-sm text-muted-foreground">Gerencie as tarefas deste projeto</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/app/projetos/${projectId}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
            <Button onClick={() => setShowCreate(true)}>
              <Plus className="mr-2 h-4 w-4" />
              Nova tarefa
            </Button>
          </div>
        </div>
      </Card>

      {/* Kanban Board */}
      <div className="flex-1 mt-4 overflow-hidden">
        <KanbanBoard
          projectId={String(projectId)}
          projectName={project.name}
          tasks={kanbanTasks}
          loading={loading}
          canEdit={true}
          onRefresh={refetch}
          onCreateTask={() => setShowCreate(true)}
        />
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
                onSaved={() => {
                  setShowCreate(false);
                  refetch();
                }}
                onCancel={() => setShowCreate(false)}
              />
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}