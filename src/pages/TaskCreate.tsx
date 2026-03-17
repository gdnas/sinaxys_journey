import { useParams, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useProjectAccess } from '@/hooks/useProjectAccess';
import AccessDenied from '@/components/AccessDenied';
import WorkItemForm from '@/components/work/WorkItemForm';

export default function TaskCreate() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { canView, canEdit, isLoading: projectLoading, project } = useProjectAccess(String(projectId ?? ''));
  
  if (projectLoading) return <div className="p-6">Carregando...</div>;
  if (!canView || !project) return <AccessDenied />;
  if (!canEdit) return <AccessDenied message="Você não tem permissão para criar tarefas neste projeto." />;

  return (
    <div className="mx-auto max-w-3xl p-6">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">Nova tarefa</h2>
          <Button variant="outline" onClick={() => navigate(`/app/projetos/${projectId}/tarefas`)}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>
        </div>
        <WorkItemForm projectId={String(projectId)} onSaved={(wi) => navigate(`/app/projetos/${projectId}/tarefas/${wi.id}`)} onCancel={() => navigate(`/app/projetos/${projectId}/tarefas`)} />
      </Card>
    </div>
  );
}
