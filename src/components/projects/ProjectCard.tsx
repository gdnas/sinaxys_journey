import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Calendar, FolderKanban, Goal, Layers3, Target, Users } from "lucide-react";
import { format } from "date-fns";

export default function ProjectCard({ project }: { project: any }) {
  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5 transition hover:-translate-y-0.5 hover:shadow-lg">
      <Link to={`/app/projetos/${project.id}`} className="block">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-lg font-semibold text-[color:var(--sinaxys-ink)]">{project.name}</h3>
              <Badge variant={getProjectStatusBadgeVariant(project.status)}>{getProjectStatusLabel(project.status)}</Badge>
              {project.okr_level ? (
                <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                  {project.okr_level === "strategic" ? "OKR estratégico" : "OKR tático"}
                </Badge>
              ) : null}
            </div>

            {project.description ? <p className="mt-2 line-clamp-2 text-sm text-muted-foreground">{project.description}</p> : null}

            <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              <Meta icon={Users} label="Responsável" value={project.owner_name ?? "—"} />
              <Meta icon={FolderKanban} label="Departamento" value={project.department_name ?? "—"} />
              <Meta icon={Calendar} label="Prazo" value={project.due_date ? format(new Date(project.due_date), "dd/MM/yyyy") : "—"} />
              <Meta icon={Goal} label="OKR" value={project.okr_title ?? "Sem vínculo"} />
              <Meta icon={Target} label="KR" value={project.key_result_title ?? "Sem vínculo"} />
              <Meta icon={Layers3} label="Entregável" value={project.deliverable_title ?? "Sem vínculo"} />
            </div>
          </div>

          <div className="rounded-2xl bg-[color:var(--sinaxys-tint)]/25 px-4 py-3 text-sm text-muted-foreground">
            <div>Membros: <span className="font-medium text-[color:var(--sinaxys-ink)]">{project.member_count ?? 0}</span></div>
            <div className="mt-1">Atualizado: <span className="font-medium text-[color:var(--sinaxys-ink)]">{project.updated_at ? format(new Date(project.updated_at), "dd/MM/yyyy") : "—"}</span></div>
          </div>
        </div>
      </Link>
    </Card>
  );
}

function Meta({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Calendar;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2 rounded-2xl bg-[color:var(--sinaxys-tint)]/15 px-3 py-2">
      <Icon className="mt-0.5 h-4 w-4 text-[color:var(--sinaxys-primary)]" />
      <div className="min-w-0">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
        <div className="truncate text-sm text-[color:var(--sinaxys-ink)]">{value}</div>
      </div>
    </div>
  );
}

function getProjectStatusLabel(status: string): string {
  const statusMap: Record<string, string> = {
    not_started: "Não iniciado",
    on_track: "No prazo",
    at_risk: "Em risco",
    delayed: "Atrasado",
    completed: "Concluído",
  };
  return statusMap[status] || status;
}

function getProjectStatusBadgeVariant(status: string): "default" | "secondary" | "destructive" | "outline" {
  const variantMap: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
    not_started: "outline",
    on_track: "secondary",
    at_risk: "destructive",
    delayed: "destructive",
    completed: "default",
  };
  return variantMap[status] || "default";
}
