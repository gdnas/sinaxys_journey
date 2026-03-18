import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { format } from "date-fns";
import { ArrowLeft, Calendar, FolderKanban, Goal, Layers3, ListChecks, Target, User, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useProjectAccess } from "@/hooks/useProjectAccess";
import AccessDenied from "@/components/AccessDenied";
import ProjectMembersSection from "@/components/projects/ProjectMembersSection";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export default function ProjetoDetail() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { canView, canEdit, canManageMembers, isLoading } = useProjectAccess(String(projectId ?? ""));

  const [project, setProject] = useState<any>(null);
  const [tasks, setTasks] = useState<any[]>([]);
  const [loadingDetails, setLoadingDetails] = useState(true);

  useEffect(() => {
    async function loadProjectDetails() {
      if (!projectId) return;

      setLoadingDetails(true);
      try {
        const { data: projectData, error: projectError } = await supabase
          .from("projects")
          .select(`
            *,
            project_members:project_members(user_id, role_in_project)
          `)
          .eq("id", projectId)
          .maybeSingle();

        if (projectError) throw projectError;
        if (!projectData) {
          setProject(null);
          return;
        }

        const ownerId = projectData.owner_user_id;
        const memberIds = (projectData.project_members ?? []).map((member: any) => member.user_id);
        const departmentIds = Array.from(
          new Set(
            [projectData.department_id, ...(Array.isArray(projectData.department_ids) ? projectData.department_ids : [])].filter(Boolean),
          ),
        );

        const [ownerResult, membersResult, departmentsResult, keyResultResult, deliverableResult, tasksResult] = await Promise.all([
          ownerId
            ? supabase.from("profiles").select("id, name, avatar_url").eq("id", ownerId).maybeSingle()
            : Promise.resolve({ data: null }),
          memberIds.length
            ? supabase.from("profiles").select("id, name, avatar_url").in("id", memberIds)
            : Promise.resolve({ data: [] as any[] }),
          departmentIds.length
            ? supabase.from("departments").select("id, name").in("id", departmentIds)
            : Promise.resolve({ data: [] as any[] }),
          projectData.key_result_id
            ? supabase.from("okr_key_results").select("id, title, objective_id").eq("id", projectData.key_result_id).maybeSingle()
            : Promise.resolve({ data: null }),
          projectData.deliverable_id
            ? supabase.from("okr_deliverables").select("id, title, key_result_id").eq("id", projectData.deliverable_id).maybeSingle()
            : Promise.resolve({ data: null }),
          supabase
            .from("work_items")
            .select("id, title, status, assignee_user_id, due_date")
            .eq("project_id", projectId)
            .order("created_at", { ascending: false })
            .limit(6),
        ]);

        let objective = null;
        if (keyResultResult.data?.objective_id) {
          const { data } = await supabase
            .from("okr_objectives")
            .select("id, title, okr_level")
            .eq("id", keyResultResult.data.objective_id)
            .maybeSingle();
          objective = data;
        }

        const assigneeIds = Array.from(new Set(((tasksResult.data ?? []) as any[]).map((task) => task.assignee_user_id).filter(Boolean)));
        const { data: assignees } = assigneeIds.length
          ? await supabase.from("profiles").select("id, name").in("id", assigneeIds)
          : { data: [] as any[] };

        const profileMap = new Map(([ownerResult.data, ...(membersResult.data ?? []), ...(assignees ?? [])].filter(Boolean) as any[]).map((item) => [item.id, item]));
        const departmentMap = new Map((departmentsResult.data ?? []).map((item: any) => [item.id, item.name]));
        const departmentNames = Array.isArray(projectData.department_ids) && projectData.department_ids.length
          ? projectData.department_ids.map((id: string) => departmentMap.get(id)).filter(Boolean)
          : projectData.department_id
            ? [departmentMap.get(projectData.department_id)].filter(Boolean)
            : [];

        setProject({
          ...projectData,
          owner: ownerResult.data,
          project_members: (projectData.project_members ?? []).map((member: any) => ({
            ...member,
            user: profileMap.get(member.user_id) ?? null,
          })),
          department_names: departmentNames,
          key_result: keyResultResult.data,
          deliverable: deliverableResult.data,
          objective,
        });

        setTasks(
          ((tasksResult.data ?? []) as any[]).map((task) => ({
            ...task,
            assignee_name: task.assignee_user_id ? profileMap.get(task.assignee_user_id)?.name ?? null : null,
          })),
        );
      } catch (error) {
        toast({
          title: "Erro ao carregar detalhes",
          description: error instanceof Error ? error.message : "Não foi possível carregar o projeto.",
          variant: "destructive",
        });
      } finally {
        setLoadingDetails(false);
      }
    }

    loadProjectDetails();
  }, [projectId, toast]);

  const tasksCount = tasks.length;
  const memberCount = useMemo(() => (Array.isArray(project?.project_members) ? project.project_members.length : 0), [project]);

  if (isLoading || loadingDetails) return <div className="p-6">Carregando...</div>;
  if (!canView) return <AccessDenied />;
  if (!project) return <div className="p-6">Projeto não encontrado.</div>;

  return (
    <div className="mx-auto grid max-w-5xl gap-6 pb-12">
      <nav className="flex items-center gap-2 text-sm text-muted-foreground">
        <Link to="/app/projetos/lista" className="hover:text-[color:var(--sinaxys-primary)]">Projetos</Link>
        <span>/</span>
        <span className="text-[color:var(--sinaxys-primary)]">{project.name}</span>
      </nav>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <Button variant="ghost" className="mb-3 rounded-2xl" onClick={() => navigate("/app/projetos/lista")}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Button>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-3xl font-bold text-[color:var(--sinaxys-ink)]">{project.name}</h1>
                <Badge variant="outline">{statusLabel(project.status)}</Badge>
                {project.objective?.okr_level ? (
                  <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                    {project.objective.okr_level === "strategic" ? "OKR estratégico" : "OKR tático"}
                  </Badge>
                ) : null}
              </div>
              {project.description ? <p className="mt-3 max-w-3xl text-sm text-muted-foreground">{project.description}</p> : null}
            </div>

            <div className="flex flex-col gap-2">
              {canEdit ? (
                <Button className="rounded-2xl bg-[color:var(--sinaxys-primary)] text-white" onClick={() => navigate(`/app/projetos/${projectId}/editar`)}>
                  Editar projeto
                </Button>
              ) : null}
              <Button variant="outline" className="rounded-2xl" onClick={() => navigate(`/app/projetos/${projectId}/tarefas`)}>
                Ver work_items
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <InfoCard icon={User} label="Responsável" value={project.owner?.name ?? "—"} />
            <InfoCard icon={FolderKanban} label="Departamento" value={project.department_names?.join(", ") || "—"} />
            <InfoCard icon={Users} label="Equipe" value={`${memberCount} participante(s)`} />
            <InfoCard icon={Calendar} label="Prazo" value={project.due_date ? format(new Date(project.due_date), "dd/MM/yyyy") : "—"} />
          </div>
        </div>
      </Card>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="mb-4">
          <h2 className="text-lg font-semibold text-[color:var(--sinaxys-ink)]">Alinhamento com OKR</h2>
          <p className="text-sm text-muted-foreground">Relação explícita entre objetivo, KR, entregável e execução.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-3">
          <InfoCard icon={Goal} label="OKR" value={project.objective?.title ?? "Sem vínculo"} />
          <InfoCard icon={Target} label="Resultado-chave" value={project.key_result?.title ?? "Sem vínculo"} />
          <InfoCard icon={Layers3} label="Entregável" value={project.deliverable?.title ?? "Sem vínculo"} />
        </div>
      </Card>

      {canManageMembers ? <ProjectMembersSection projectId={String(projectId)} /> : null}

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="mb-4 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-semibold text-[color:var(--sinaxys-ink)]">Tarefas associadas</h2>
            <p className="text-sm text-muted-foreground">Os work_items seguem como única fonte de verdade da execução.</p>
          </div>
          <Badge variant="outline">{tasksCount} item(ns)</Badge>
        </div>

        {tasks.length ? (
          <div className="grid gap-3">
            {tasks.map((task) => (
              <div key={task.id} className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)]/15 p-4">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="font-medium text-[color:var(--sinaxys-ink)]">{task.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">
                      {task.assignee_name ? `Responsável: ${task.assignee_name}` : "Sem responsável"}
                      {task.due_date ? ` • Prazo: ${format(new Date(task.due_date), "dd/MM/yyyy")}` : ""}
                    </div>
                  </div>
                  <Badge variant="outline">{taskStatusLabel(task.status)}</Badge>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-[color:var(--sinaxys-tint)]/20 p-4 text-sm text-muted-foreground">Nenhum work_item cadastrado neste projeto ainda.</div>
        )}

        <Button variant="outline" className="mt-4 rounded-2xl" onClick={() => navigate(`/app/projetos/${projectId}/tarefas`)}>
          <ListChecks className="mr-2 h-4 w-4" />
          Abrir execução completa
        </Button>
      </Card>
    </div>
  );
}

function InfoCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof User;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-2xl bg-[color:var(--sinaxys-tint)]/15 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-white p-2 text-[color:var(--sinaxys-primary)] shadow-sm">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
          <div className="mt-1 text-sm font-medium text-[color:var(--sinaxys-ink)]">{value}</div>
        </div>
      </div>
    </div>
  );
}

function statusLabel(status: string) {
  const labels: Record<string, string> = {
    not_started: "Não iniciado",
    on_track: "No prazo",
    at_risk: "Em risco",
    delayed: "Atrasado",
    completed: "Concluído",
  };
  return labels[status] ?? status;
}

function taskStatusLabel(status: string) {
  const labels: Record<string, string> = {
    backlog: "Backlog",
    todo: "A fazer",
    in_progress: "Em andamento",
    review: "Em revisão",
    done: "Concluído",
    blocked: "Bloqueado",
  };
  return labels[status] ?? status;
}
