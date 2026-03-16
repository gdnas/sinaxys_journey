import { useParams, Link, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, ArrowLeft } from 'lucide-react';

export default function ProjetosTasks() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const projectIdStr = Array.isArray(projectId) ? projectId[0] : projectId;

  return (
    <div className="mx-auto max-w-6xl grid gap-6 pb-12">
      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Tarefas</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate(`/app/projetos/${projectId}`)}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-muted-foreground">0 tarefas</div>
        </div>

        <div className="text-center py-8 text-muted-foreground">
          Lista de tarefas do projeto placeholder
        </div>
      </Card>
    </div>
  );
}
