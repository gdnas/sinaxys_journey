import { Link } from 'react-router-dom';
import { FolderKanban, CheckCircle2, Clock, AlertCircle, XCircle, Calendar, Users } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { ProjectStatus } from '@/lib/projectsDb';

export default function ProjectCard({ project }: { project: any }) {
  return (
    <Card className="rounded-2xl p-4 hover:shadow-md transition-shadow">
      <Link to={`/app/projetos/${project.id}`} className="block">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold truncate">{project.name}</h3>
              <Badge variant={getProjectStatusBadgeVariant(project.status)}>
                {getProjectStatusLabel(project.status)}
              </Badge>
            </div>
            
            <p className="mt-1 text-sm text-muted-foreground truncate">{project.description}</p>
            
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <div className="flex items-center gap-1">
                <Users className="h-3.5 w-3.5 text-muted-foreground" />
                {project.owner_name ?? '—'}
              </div>
              <div className="flex items-center gap-1">
                <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
                Departamento: {project.department_name ?? '—'}
              </div>
              <div className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                Prazo: {project.due_date ? format(new Date(project.due_date), 'dd/MM/yyyy') : '—'}
              </div>
            </div>
          </div>
          
          <div className="text-right text-sm text-muted-foreground">
            <div>Membros: {project.member_count ?? 0}</div>
            <div>Atualizado: {project.updated_at ? format(new Date(project.updated_at), 'dd/MM/yyyy') : '—'}</div>
          </div>
        </div>
      </Link>
    </Card>
  );
}

function getProjectStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    not_started: 'Não iniciado',
    on_track: 'No prazo',
    at_risk: 'Em risco',
    delayed: 'Atrasado',
    completed: 'Concluído',
  };
  return statusMap[status] || status;
}

function getProjectStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const variantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    not_started: 'outline',
    on_track: 'secondary',
    at_risk: 'destructive',
    delayed: 'destructive',
    completed: 'default',
  };
  return variantMap[status] || 'default';
}
