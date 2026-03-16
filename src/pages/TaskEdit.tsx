import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useWorkItemAccess } from '@/hooks/useWorkItemAccess';
import AccessDenied from '@/components/AccessDenied';
import WorkItemForm from '@/components/work/WorkItemForm';
import TaskStatusHistory from '@/components/work/TaskStatusHistory';

export default function TaskEdit() {
  const { projectId, taskId } = useParams();
  const navigate = useNavigate();
  const { canView, canEdit, isLoading, workItem } = useWorkItemAccess(String(taskId ?? ''));

  if (isLoading) return <div className="p-6">Carregando...</div>;
  if (!canView || !workItem) return <AccessDenied />;

  return (
    <div className="mx-auto max-w-5xl grid gap-6 p-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Editar tarefa</h2>
          <Button variant="outline" onClick={() => navigate(`/app/projetos/${projectId}/tarefas`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
        {canEdit ? (
          <WorkItemForm workItem={workItem} projectId={String(projectId)} onSaved={(wi) => navigate(`/app/projetos/${projectId}/tarefas/${wi.id}`)} />
        ) : (
          <AccessDenied message="Voce nao tem permissao para editar esta tarefa." />
        )}

        {canEdit && <TaskStatusHistory workItemId={String(taskId ?? '')} />}
      </Card>
    </div>
  );
}
