import { useMemo } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  Award,
  BookOpen,
  Building2,
  CheckCircle2,
  LayoutDashboard,
  MapPinned,
  Network,
  Sparkles,
  Target,
  Trophy,
  Users,
  Wallet,
  Handshake,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { format, endOfWeek, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { isCompanyModuleEnabled } from "@/lib/modulesDb";
import { computeProgress } from "@/lib/sinaxys";
import { getAssignmentsForUser } from "@/lib/journeyDb";
import { fetchLeaderboard } from "@/lib/pointsDb";
import { VacationSummaryCard } from "@/components/VacationSummaryCard";

// Import okr_db functions for tasks (okr_tasks, NOT work_items)
import {
  listTasksForCompany,
  listTasksForDepartment,
  listTasksForUser,
  type DbTaskWithContext,
} from "@/lib/okrDb";

// Import work_items functions for dashboard metrics (REALITY OPERACIONAL)
import {
  listWorkItemsForDashboardCompany,
  listWorkItemsForDashboardDepartment,
  listWorkItemsForDashboardUser,
} from "@/lib/projectsDb";

function formatPts(n: number) {
  return new Intl.NumberFormat("pt-BR").format(Math.round(n));
}

function StatPill({
  label,
  value,
  icon,
  to,
  hint,
  tourId,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  to: string;
  hint?: string;
  tourId?: string;
}) {
  return (
    <Card className="group rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5 transition hover:bg-[color:var(--sinaxys-tint)]/30">
      <Link to={to} className="block" data-tour={tourId}>
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{label}</div>
            <div className="mt-2 text-2xl font-semibold tracking-tight text-[color:var(--sinaxys-ink)]">{value}</div>
            {hint ? <div className="mt-1 text-xs text-muted-foreground">{hint}</div> : null}
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)] transition group-hover:bg-white">
            {icon}
          </div>
        </div>
      </Link>
    </Card>
  );
}

function ShortcutCard({
  title,
  desc,
  icon,
  to,
  badge,
  tourId,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  to: string;
  badge?: string;
  tourId?: string;
}) {
  return (
    <Card className="group relative overflow-hidden rounded-3xl border-[color:var(--sinaxys-border)] bg-white">
      <Link to={to} className="relative block p-6" data-tour={tourId}>
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <div className="text-base font-semibold tracking-tight text-[color:var(--sinaxys-ink)]">{title}</div>
              {badge ? (
                <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)] hover:bg-white">
                  {badge}
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
          </div>
          <div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)] transition group-hover:bg-white">
            {icon}
          </div>
        </div>

        <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--sinaxys-primary)]">
          Abrir
          <ArrowRight className="ml-2 h-4 w-4" />
        </div>
      </Link>
    </Card>
  );
}

function RiskList({
  title,
  subtitle,
  tasks,
  to,
}: {
  title: string;
  subtitle: string;
  tasks: DbTaskWithContext[];
  to: string;
}) {
  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{title}</div>
          <p className="mt-1 text-sm text-muted-foreground">{subtitle}</p>
        </div>
        <Button asChild variant="outline" className="h-11 rounded-xl bg-white">
          <Link to={to}>
            Abrir OKRs
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      </div>

      <Separator className="my-5" />

      <div className="grid gap-3">
        {tasks.length ? (
          tasks.slice(0, 5).map((t) => (
            <Link
              key={t.id}
              to={`/okr/objetivos/${t.objective_id}`}
              className="block rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4 transition hover:bg-[color:var(--sinaxys-tint)]/40"
              title="Abrir objetivo"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{t.title}</div>
                  <div className="mt-1 truncate text-xs text-muted-foreground">
                    Objetivo: <span className="font-medium text-[color:var(--sinaxys-ink)]">{t.objective_title}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
                    {t.due_date ? String(t.due_date).slice(0, 10).split("-").reverse().join("/") : "sem prazo"}
                  </Badge>
                  <span className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--sinaxys-primary)]">
                    <span className="hidden sm:inline">Abrir</span>
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </div>
            </Link>
          ))
        ) : (
          <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Nenhum item crítico por aqui.</div>
        )}
      </div>
    </Card>
  );
}

export default function AppDashboard() {
  const { user } = useAuth();
  const { company } = useCompany();

  if (!user) return null;

  const companyId = user.companyId ?? null;

  const isCollaborador = user.role === "COLABORADOR";
  const isHead = user.role === "HEAD";
  const isAdmin = user.role === "ADMIN";

  const { data: pdiEnabled = false } = useQuery({
    queryKey: ["company-module", companyId, "PDI_PERFORMANCE"],
    queryFn: () => isCompanyModuleEnabled(String(companyId), "PDI_PERFORMANCE"),
    enabled: !!companyId,
  });

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ["assignments-for-user", user.id],
    queryFn: () => getAssignmentsForUser(user.id),
  });

  const inProgress = assignments.filter((a) => a.assignment.status !== "COMPLETED");
  const completed = assignments.filter((a) => a.assignment.status === "COMPLETED");

  const next = inProgress
    .slice()
    .sort((a, b) => (b.assignment.started_at ?? b.assignment.assigned_at).localeCompare(a.assignment.started_at ?? a.assignment.assigned_at))[0];

  const today = new Date();
  const todayLabel = format(today, "EEEE, d 'de' MMMM", { locale: ptBR });
  const todayIso = format(today, "yyyy-MM-dd");
  const weekFrom = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekTo = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");

  // =====================================================
  // WORK ITEMS: Dashboard metrics (USANDO work_items como fonte única)
  // =====================================================
  
  // 1. Minhas tarefas (COLABORADOR)
  const { data: myWeekWorkItems = [] } = useQuery({
    queryKey: ["dashboard-my-work-items", companyId, user.id, weekFrom, weekTo],
    enabled: !!companyId && isCollaborador,
    queryFn: () => listWorkItemsForDashboardUser(companyId as string, user.id, { from: weekFrom, to: weekTo }),
  });

  const myOpenWorkItems = useMemo(() => myWeekWorkItems.filter((t: any) => t.status !== "done"), [myWeekWorkItems]);

  // 2. Tarefas da empresa (para HEAD/ADMIN)
  const { data: scopeWorkItems = [] } = useQuery({
    queryKey: ["dashboard-scope-work-items", companyId, user.role, user.departmentId, weekFrom, weekTo],
    enabled: !!companyId && ((isHead && !!user.departmentId) || isAdmin),
    queryFn: () => {
      if (isAdmin) return listWorkItemsForDashboardCompany(companyId as string, { from: weekFrom, to: weekTo });
      return listWorkItemsForDashboardDepartment(companyId as string, user.departmentId as string, { from: weekFrom, to: weekTo });
    },
  });

  const scopeOpenWorkItems = useMemo(() => scopeWorkItems.filter((t: any) => t.status !== "done"), [scopeWorkItems]);
  const scopeOverdueWorkItems = useMemo(
    () => scopeOpenWorkItems.filter((t: any) => t.due_date && String(t.due_date) < todayIso),
    [scopeOpenWorkItems, todayIso],
  );

  // Calcular métricas de work items (usando work_items como fonte única)
  const calculateWorkItemMetrics = (workItems: any[]) => {
    const allOpenTasks = workItems.filter((t: any) => t.status !== 'done' && t.status !== 'review');
    const completedTasks = workItems.filter((t: any) => t.status === 'done');
    const inProgressTasks = workItems.filter((t: any) => t.status === 'in_progress');
    const overdueTasks = workItems.filter((t: any) => t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done');
    
    return {
      allOpenTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
    };
  };

  const myWorkItemMetrics = useMemo(
    () => calculateWorkItemMetrics(myWeekWorkItems),
    [myWeekWorkItems, weekFrom, weekTo]
  );

  const scopeWorkItemMetrics = useMemo(
    () => calculateWorkItemMetrics(scopeWorkItems),
    [scopeWorkItems, weekFrom, weekTo]
  );

  // =====================================================
  // 5. PROJETOS ATIVOS
  // =====================================================
  const { data: activeProjects = [] } = useQuery({
    queryKey: ["dashboard-active-projects", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          id,
          name,
          status,
          start_date,
          due_date,
          owner_user_id
        `)
        .eq("tenant_id", companyId)
        .in("status", ["not_started", "in_progress", "at_risk", "delayed"])
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true })
        .order("created_at", { ascending: true });
      
      if (error) throw error;
      return data ?? [];
    },
  });

  const activeProjectsCount = useMemo(() => {
    return activeProjects.length;
  }, [activeProjects]);

  // =====================================================
  // 6. MEUS PROJETOS
  // =====================================================
  const myProjectIds = useMemo(() => {
    return myWeekWorkItems
      .filter((t: any) => t.project_id)
      .map((t: any) => t.project_id);
  }, [myWeekWorkItems]);

  const myProjectIdsStr = useMemo(() => {
    if (!myProjectIds.length) return '';
    return `'${myProjectIds.map(id => `'${id}'`).join(',')}'`;
  }, [myProjectIds]);

  const { data: myProjects = [] } = useQuery({
    queryKey: ["dashboard-my-projects", companyId, myProjectIdsStr],
    enabled: !!companyId && myProjectIdsStr.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(`
          id,
          name,
          description,
          status,
          start_date,
          due_date,
          owner_user_id
          key_result_id,
          deliverable_id
        `)
        .in("id", myProjectIdsStr)
        .eq("tenant_id", companyId)
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });

      if (error) throw error;
      return (data ?? []) as unknown;
    },
  });

  // Calcular métricas dos meus projetos
  const myProjectMetrics = useMemo(() => {
    if (!myProjects || myProjects.length === 0) {
      return {
        total: 0,
        inProgress: 0,
        done: 0,
        inProgressTasks: 0,
        myWeekTasks.length,
      };
    }

    const inProgressProjects = myProjects.filter((p: any) => p.status === 'in_progress');
    const doneProjects = myProjects.filter((p: any) => p.status === 'done');
    const todoProjects = myProjects.filter((p: any) => p.status === 'not_started' || p.status === 'at_risk' || p.status === 'delayed');

    // Total de tarefas
    const inProgressTasks = myProjects.reduce((acc, p: any) => {
      // Filtrar work_items do projeto por usuário (assignee_user_id = userId OR created_by_user_id = userId)
      const projectTasks = myWeekWorkItems.filter((t: any) => t.project_id === p.id);
      const userTasks = projectTasks.filter((t: any) => t.assignee_user_id === userId || t.created_by_user_id === userId);
      const doneUserTasks = userTasks.filter((t: any) => t.status === 'done');
      const inProgressUserTasks = userTasks.filter((t: any) => t.status === 'in_progress');
      
      return acc + inProgressUserTasks.length;
    }, 0);

    return {
      total: myProjects.length,
      inProgress: inProgressProjects.length,
      done: doneProjects.length,
      inProgressTasks,
      myWeekTasks.length,
    };
  }, [myProjects, myProjectMetrics, myWeekTasks.length]);

  const today = new Date();
  const todayLabel = format(today, "EEEE, d 'de' MMMM", { locale: ptBR });
  const todayIso = format(today, "yyyy-MM-dd");

  // Render condicional baseado em role
  const showTeamMetrics = isHead || isAdmin;

  const subtitle = isAdmin
    ? "Visão executiva: saúde do trimestre, execução crítica e atalhos de gestão."
    : isHead
      ? "Visão do time: o que está em risco e o que destrava a semana."
      : "Seus principais atalhos: execução (OKRs), evolução (trilhas) e reconhecimento.";

  // =====================================================
  // WORK ITEMS: Dashboard metrics (usando work_items como fonte única)
  // =====================================================
  
  // 1. Minhas tarefas (sempre mostrado)
  const myWeekTasks = myWeekWorkItems;
  const myOpenTasks = myOpenWorkItems;
  const myOverdueTasks = myWorkItemMetrics.overdueTasks;

  // 2. Tarefas da empresa (para HEAD/ADMIN)
  const scopeTasks = scopeWorkItems;
  const scopeOpenTasks = scopeOpenWorkItems;
  const scopeOverdueTasks = scopeOverdueWorkItems;

  return (
    <div className="grid gap-6">
      <Card data-tour="dash-hero" className="relative overflow-hidden rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] px-3 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)]">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-white ring-1 ring-[color:var(--sinaxys-border)]">
                <LayoutDashboard className="h-3.5 w-3.5 text-[color:var(--sinaxys-primary)] />
              </span>
              Minha jornada
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[color:var(--sinaxys-ink)]">
              {company?.name ? company.name : "Sua área"}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{todayLabel}. {subtitle}</p>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" data-tour="dash-next-action">
              {next ? (
                <Button
                  asChild
                  className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                >
                  <Link to={`/app/tracks/${next.assignment.id}`}>
                    Continuar trilha
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              ) : (
                <Button asChild variant="outline" className="h-11 rounded-xl bg-white">
                  <Link to="/tracks">
                    Explorar trilhas
                    <BookOpen className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              )}
              <Button asChild variant="outline" className="h-11 rounded-xl bg-white">
                <Link to={isCollaborador ? "/okr/hoje" : "/okr/quarter"}>
                  {isCollaborador ? "Minhas tarefas" : "Ver OKRs"}
                  <Target className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>

          <Separator className="my-5" />

          {/* =====================================================
             MEUS PROJECTS (SOMENTE COLABORADOR)
             ===================================================== */}
          {isCollaborador && (
            <>
              {/* MY TASKS CARD */}
              <div className="grid gap-4 lg:grid-cols-3">
                <StatPill
                  label="Minhas tarefas"
                  value={myWorkItemMetrics.allOpenTasks.toString()}
                  hint="na sua semana"
                  icon={<Target className="h-5 w-5" />}
                  to="/okr/hoje"
                />

                <StatPill
                  label="Concluídas"
                  value={myWorkItemMetrics.completedTasks.toString()}
                  hint={`${myWorkItemMetrics.completedTasks > 0 ? `${myWorkItemMetrics.completedTasks}/${myWorkItemMetrics.allOpenTasks.length} (${Math.round(myWorkItemMetrics.completedTasks / Math.max(myWorkItemMetrics.allOpenTasks.length, 1) * 100}%)` : "0%"`}
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  to="/okr/hoje"
                />

                <StatPill
                  label="Em progresso"
                  value={myWorkItemMetrics.inProgressTasks.toString()}
                  hint={myWorkItemMetrics.inProgressTasks.length > 0
                    ? `${myWorkItemMetrics.inProgressTasks}/${myWorkItemMetrics.myWeekTasks.length}`
                    : `${myWorkItemMetrics.myWeekTasks.length}/${myWorkItemMetrics.myWeekTasks.length}`
                  }
                  icon={<CheckCircle2 className="h-5 w-5" />}
                  to="/okr/hoje"
                />
              </div>

              {/* MY PROJECTS CARD */}
              {myProjectMetrics.total > 0 && (
                <>
                  <Link
                    to={`/app/projetos/${myProjectIds[0]}/tarefas`}
                    className="block mt-4"
                  >
                    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Meus projetos</div>
                          <div className="mt-1 text-sm text-muted-foreground">
                            {myProjectMetrics.inProgressTasks} tarefas em andamento
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className="w-fit rounded-full bg-[color:var(--sinaxys-bg)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                            {myProjectMetrics.inProgressTasks > 0
                              ? `${myProjectMetrics.inProgressTasks}/${myProjectMetrics.total}`
                              : `${myProjectMetrics.total}`
                            )}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  </Link>
                </>
              )}
            </>
          )}

          {/* =====================================================
             TIME METRICS (somente HEAD/ADMIN)
             ===================================================== */}
          {showTeamMetrics && teamWorkItemMetrics && (
            <>
              <div className="grid gap-4 lg:grid-cols-3">
                {/* 1. Tarefas abertas da empresa */}
                <StatPill
                      label={isAdmin ? "Empresa — tarefas abertas" : "Time — tarefas abertas"}
                      value={`${teamWorkItemMetrics.allOpenTasks.toString()}`}
                      hint={`Janela ${weekFrom.split("-").reverse().join("/")} → ${weekTo.split("-").reverse().join("/")}`}
                      icon={<Target className="h-5 w-5" />}
                      to="/okr/hoje"
                />

                {/* 2. Tarefas atrasadas */}
                <StatPill
                      label={isAdmin ? "Empresa — tarefas atrasadas" : "Time — tarefas atrasadas"}
                      value={teamWorkItemMetrics.overdueTasks.toString()}
                      hint="priorize estas primeiro"
                      icon={<MapPinned className="h-5 w-5" />}
                      to="/okr/hoje"
                />

                {/* 3. Projetos ativos */}
                <StatPill
                      label={isAdmin ? "Empresa — Projetos ativos" : "Time — Projetos ativos"}
                      value={activeProjectsCount.toString()}
                      hint={isAdmin
                        ? `${activeProjectsCount} projetos ativos`
                        : `${activeProjectsCount} projetos ativos`
                      }
                      icon={<Target className="h-5 w-5" />}
                      to="/app/projetos/dashboard"
                  />
                />
              </div>
            </>
          )}
        </Card>
      </div>
    </div>
  );
}
