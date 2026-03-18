import { useParams } from 'react-router-dom';
import { useProjectAccess } from '@/hooks/useProjectAccess';
import useWorkItems from '@/hooks/useWorkItems';
import KanbanBoard from '@/components/work/KanbanBoard';
import { KanbanTask } from '@/hooks/useKanban';

export default function ProjetosKanban() {
  const { projectId } = useParams();
  const { canView, isLoading: projectLoading, project } = useProjectAccess(String(projectId ?? ''));
  const { taskList, loading, error, refetch } = useWorkItems(String(projectId ?? ''));

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
    <KanbanBoard
      projectId={String(projectId)}
      projectName={project.name}
      tasks={kanbanTasks}
      loading={loading}
      canEdit={true}
      onRefresh={refetch}
    />
  );
}