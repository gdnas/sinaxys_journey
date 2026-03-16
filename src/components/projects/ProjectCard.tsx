import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { format } from 'date-fns';
import { ProjectStatus } from '@/lib/projectsDb';

export default function ProjectCard({ project }: { project: any }) {
  return (
    <Card className="rounded-2xl p-4">
      <Link to={`/app/projetos/${project.id}`} className="block">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3">
              <h3 className="text-lg font-semibold truncate">{project.name}</h3>
              <div className="text-sm text-muted-foreground">{project.status}</div>
            </div>
            <p className="mt-1 text-sm text-muted-foreground truncate">{project.description}</p>
            <div className="mt-3 flex flex-wrap gap-3 text-sm text-muted-foreground">
              <div>Responsável: {project.owner_name ?? '—'}</div>
              <div>Departamento: {project.department_name ?? '—'}</div>
              <div>Praz o: {project.due_date ? format(new Date(project.due_date), 'dd/MM/yyyy') : '—'}</div>
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
