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
import {
  listOkrCycles,
  listOkrObjectives,
  listTasksForCompany,
  listTasksForDepartment,
  listTasksForUser,
  type DbTaskWithContext,
} from "@/lib/okrDb";

// Import work items functions for dashboard metrics
import {
  listWorkItemsForCompany,
  listWorkItemsForDepartment,
  listWorkItemsForUser,
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
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-row sm:items-center sm:justify-between">
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
          <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">
            Nenhum item crítico por aqui.
          </div>
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

  const isCollaborator = user.role === "COLABORADOR";
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
    .sort((a, b) => (b.assignment.started_at ?? a.assignment.assigned_at).localeCompare(a.assignment.started_at ?? a.assignment.assigned_at))[0];

  const today = new Date();
  const todayLabel = format(today, "EEEE, d 'de' MMMM", { locale: ptBR });
  const todayIso = format(today, "yyyy-MM-dd");
  const weekFrom = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekTo = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");

  // My tasks (always useful)
  const { data: myWeekTasks = [] } = useQuery({
    queryKey: ["okr-my-tasks", companyId, user.id, weekFrom, weekTo],
    enabled: !!companyId,
    queryFn: () => listTasksForUser(companyId as string, user.id, { from: weekFrom, to: weekTo }),
  });

  const myOpenTasks = useMemo(() => myWeekTasks.filter((t) => t.status !== "DONE"), [myWeekTasks]);

  // Team/company tasks (for HEAD/ADMIN)
  const { data: scopeTasks = [] } = useQuery({
    queryKey: ["okr-scope-tasks", companyId, user.role, user.departmentId, weekFrom, weekTo],
    enabled: !!companyId && ((isHead && !!user.departmentId) || isAdmin),
    queryFn: () => {
      if (isAdmin) return listTasksForCompany(companyId as string, { from: weekFrom, to: weekTo });
      return listTasksForDepartment(companyId as string, user.departmentId as string, { from: weekFrom, to: weekTo });
    },
  });

  const scopeOpenTasks = useMemo(() => scopeTasks.filter((t) => t.status !== "DONE"), [scopeTasks]);

  const scopeOverdueTasks = useMemo(
    () => scopeOpenTasks.filter((t) => t.due_date && String(t.due_date) < todayIso),
    [scopeOpenTasks, todayIso],
  );

  // Active quarter objectives (for HEAD/ADMIN)
  const { data: cycles = [] } = useQuery({
    queryKey: ["okr-cycles", companyId],
    enabled: !!companyId && (isHead || isAdmin),
    queryFn: () => listOkrCycles(companyId as string),
  });

  const activeQuarter = cycles.find((c) => c.type === "QUARTERLY" && c.status === "ACTIVE") ?? null;

  const { data: quarterObjectives = [] } = useQuery({
    queryKey: ["okr-objectives", companyId, activeQuarter?.id],
    enabled: !!companyId && !!activeQuarter?.id && (isHead || isAdmin),
    queryFn: () => listOkrObjectives(companyId as string, String(activeQuarter?.id)),
  });

  const scopedObjectives = useMemo(() => {
    if (isAdmin) return quarterObjectives;
    if (isHead) return quarterObjectives.filter((o) => o.department_id === user.departmentId);
    return [];
  }, [quarterObjectives, isAdmin, isHead, user.department_id]);

  const objectivesByLevel = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of scopedObjectives) m.set(o.level, (m.get(o.level) ?? 0) + 1);
    return m;
  }, [scopedObjectives, isAdmin, isHead, user.departmentId]);

  // Points (lightweight identity/engagement)
  const { data: leaderboard = [] } = useQuery({
    queryKey: ["points", "leaderboard", companyId],
    enabled: !!companyId,
    queryFn: () => fetchLeaderboard(companyId as string, 50),
  });

  const { myPoints, myRank } = useMemo(() => {
    const mine = leaderboard.find((r) => r.user_id === user.id);
    const idx = leaderboard.findIndex((r) => r.user_id === user.id);
    return {
      myPoints: mine?.total_points ?? 0,
      myRank: idx >= 0 ? idx + 1 : null,
    };
  }, [leaderboard, user.id]);

  const subtitle = isAdmin
    ? "Visão executiva: saúde do trimestre, execução crítica e atalhos de gestão."
    : isHead
      ? "Visão do time: o que está em risco e o que destrava a semana."
      : "Seus principais atalhos: execução (OKRs), evolução (trilhas) e reconhecimento.";

  // =====================================================
  // WORK ITEMS: Dashboard metrics (usando work_items como fonte única)
  // =====================================================

  // 1. Minhas tarefas (openTasks)
  const { data: myWeekWorkItems = [] } = useQuery({
    queryKey: ["dashboard-my-work-items", companyId, user.id, weekFrom, weekTo],
    enabled: !!companyId,
    queryFn: () => listWorkItemsForUser(companyId as string, user.id, { from: weekFrom, to: weekTo }),
  });

  // 2. Tarefas da empresa (para HEAD/ADMIN)
  const { data: scopeWorkItems = [] } = useQuery({
    queryKey: ["dashboard-scope-work-items", companyId, user.role, user.departmentId, weekFrom, weekTo],
    enabled: !!companyId && ((isHead && !!user.departmentId) || isAdmin),
    queryFn: () => {
      if (isAdmin) return listWorkItemsForCompany(companyId as string, { from: weekFrom, to: weekTo });
      return listWorkItemsForDepartment(companyId as string, user.departmentId as string, { from: weekFrom, to: weekTo });
    },
  });

  // Calcular métricas de work items (usando work_items como fonte única)
  const calculateWorkItemMetrics = (workItems: any[]) => {
    const allOpenTasks = workItems.filter((t: any) => t.status !== 'done' && t.status !== 'review' && t.status !== 'in_progress');
    
    // Tarefas concluídas
    const completedTasks = workItems.filter((t: any) => t.status === 'done');
    
    // Tarefas em progresso
    const inProgressTasks = workItems.filter((t: any) => t.status === 'in_progress');
    
    // Tarefas atrasadas
    const overdueTasks = workItems.filter((t: any) => {
      return t.due_date && new Date(t.due_date) < new Date() && t.status !== 'done';
    });
    
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
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown;
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
      .filter((t) => t.project_id)
      .map((t) => t.project_id);
  }, [myWeekWorkItems]);

  const myProjectIdsStr = useMemo(() => {
    if (!myProjectIds.length) return "";
    return `'${myProjectIds.map(id => `'${id}'`).join(',')}``;
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
          owner_user_id,
          key_result_id,
          deliverable_id
        `)
        .in("id", myProjectIds)
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
        inProgressTasks: myWorkItemMetrics.inProgressTasks,
        myWeekTasks.length,
      };
    }

    const inProgressProjects = myProjects.filter((p) => p.status === "in_progress");
    const doneProjects = myProjects.filter((p) => p.status === "done");
    const todoProjects = myProjects.filter((p) => p.status === "not_started" || p.status === "at_risk" || p.status === "delayed");

    const inProgressProjectsCount = inProgressProjects.length;
    const doneProjectsCount = doneProjects.length;
    const todoProjectsCount = todoProjects.length;

    // Total de tarefas
    const inProgressTasksCount = myWorkItemMetrics.inProgressTasks;
    const todoTasksCount = myProjectMetrics.allOpenTasks;
    
    return {
      total: myProjects.length,
      inProgress: inProgressProjects.length,
      done: doneProjects.length,
      inProgressTasks,
      myWeekTasks.length,
    };
  }, [myProjects, myWorkItemMetrics.inProgressTasks, myWeekTasks.length]);

  // =====================================================
  // 7. CALCULAR MÉTRICAS DA EQUIPE
  // =====================================================
  const showTeamMetrics = isHead || isAdmin;

  const teamMetrics = useMemo(() => {
    if (!showTeamMetrics) return null;

    // Usar scopeWorkItemMetrics (já calculados acima)
    const teamOpenTasks = scopeWorkItemMetrics.allOpenTasks;
    const teamCompletedTasks = scopeWorkItemMetrics.completedTasks;
    const teamInProgressTasks = scopeWorkItemMetrics.inProgressTasks;
    const teamOverdueTasks = scopeWorkItemMetrics.overdueTasks;

    return {
      allOpenTasks: teamOpenTasks,
      completedTasks: teamCompletedTasks,
      inProgressTasks: teamInProgressTasks,
      overdueTasks: teamOverdueTasks,
    };
  }, [showTeamMetrics, scopeWorkItemMetrics]);

  const today = new Date();
  const todayIso = format(today, "yyyy-MM-dd");

  // =====================================================
  // 8. RENDERIZAR DASHBOARD
  // =====================================================
  
  const renderDashboard = () => {
    return (
      <div className="grid gap-6">
        {/* HERO CARD */}
        <Card data-tour="dash-hero" className="relative overflow-hidden rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] px-3 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)]">
                <span className="grid h-5 w-5 place-items-center rounded-full bg-white ring-1 ring-[color:var(--sinaxys-border)]">
                  <LayoutDashboard className="h-3.5 w-3.5 text-[color:var(--sinaxys-primary)]" />
                </span>
                Minha jornada
              </div>

              <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[color:var(--sinaxys-ink)]">
                {company?.name ? company.name : "Sua área"}
              </h1>
              <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{todayLabel}. {subtitle}</p>

              <div className="flex flex-col gap-2 sm:flex-row sm:flex-row sm:items-center sm:justify-between" data-tour="dash-next-action">
                {next ? (
                  <Button asChild className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
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

            {/* MINHAS TAREFAS (COLABORADOR) */}
            {isCollaborador && (
              <>
                {/* CARD 1: Minhas tarefas */}
                <div className="grid gap-4 lg:grid-cols-3">
                  <StatPill
                    label="Minhas tarefas"
                    value={`${myWorkItemMetrics.allOpenTasks.length}`}
                    hint="na sua semana"
                    icon={<Target className="h-5 w-5" />}
                    to="/okr/hoje"
                  />

                  <StatPill
                    label="Concluídas"
                    value={`${myWorkItemMetrics.completedTasks.length}`}
                    hint={myWorkItemMetrics.completedTasks > 0 ? `${myWorkItemMetrics.completedTasks}/${myWorkItemMetrics.allOpenTasks.length} (${Math.round(myWorkItemMetrics.completedTasks / Math.max(myWorkItemMetrics.allOpenTasks.length, 1) * 100}%)` : "0%"}
                    icon={<CheckCircle2 className="h-5 w-5" />}
                    to="/okr/hoje"
                  />

                  <StatPill
                    label="Em progresso"
                    value={`${myWorkItemMetrics.inProgressTasks.length}`}
                    hint={myWorkItemMetrics.inProgressTasks.length > 0 ? `${myWorkItemMetrics.inProgressTasks} tarefas em andamento` : "Nenhuma tarefa em andamento"}
                    icon={<CheckCircle2 className="h-5 w-5" />}
                    to="/okr/hoje"
                  />
                </div>

                {/* CARD 2: Projetos onde sou membro */}
                {myProjectMetrics.total > 0 && (
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
                            {myProjectMetrics.inProgressTasks > 0 ? (
                              `${myProjectMetrics.inProgressTasks}/${myProjectMetrics.total}`
                            ) : (
                              `${myProjectMetrics.total}`
                            )}
                          </Badge>
                        </div>
                      </div>
                    </Card>
                  </Link>
                )}
              </>
            )}
          </Card>

          {/* =====================================================
             // O QUE IMPORTA AGORA
             // ===================================================== */}
          <div>
            <div className="mb-6">
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">O que importa agora</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Acesse rápido os módulos que mais destravam o seu dia.
              </p>
            </div>

            <div className="mt-4 grid gap-6 md:grid-cols-2">
              <ShortcutCard
                title="OKRs"
                desc={isAdmin
                  ? "Saúde do trimestre: objetivos, KRs, entregáveis e tarefas."
                  : isHead
                    ? "OKRs do seu departamento e execução do time."
                    : "Suas prioridades do dia e da semana."
                icon={<MapPinned className="h-5 w-5" />}
                to={isCollaborador ? "/okr/hoje" : "/okr/quarter"}
                badge="execução"
                tourId="dash-okr"
              />

              <ShortcutCard
                title="Trilhas"
                desc={isAdmin
                  ? "Aprendizado em sequência: onboarding e trilhas estratégicas."
                  : isHead
                    ? "Acompanhe trilhas do time e delegações."
                    : "Aprendizado em sequência e trilhas estratégicas."
                icon={<BookOpen className="h-5 w-5" />}
                to={isHead ? "/head/tracks" : "/tracks"}
                badge="evolução"
                tourId="dash-trilhas"
              />

              <ShortcutCard
                title="Points"
                desc={isAdmin
                  ? "Engajamento e regras de pontuação."
                  : isHead
                    ? "Ranking, prêmios e recompensas."
                    : "Ranking e recompensas."
                icon={<Sparkles className="h-5 w-5" />}
                to={isAdmin ? "/rankings?tab=rules" : "/rankings"}
                badge="reconhecimento"
                tourId="dash-points"
              />

              <ShortcutCard
                title={isAdmin ? "Empresa" : "Time"}
                desc={isAdmin
                  ? "Organograma e contexto da sua organização."
                  : "Organograma e contexto da sua organização."
                icon={<Network className="h-5 w-5" />}
                to="/org"
                badge="contexto"
                tourId="dash-org"
              />

              {isAdmin || isHead ? (
                <VacationSummaryCard />
              ) : null}
            </div>

            {/* =====================================================
               // RISK LIST (CRITICAL EXECUTION)
               // ===================================================== */}
          {showTeamMetrics && teamWorkItemMetrics.overdueTasks.length > 0 && (
            <RiskList
              title={isAdmin ? "Execução crítica (empresa)" : "Execução crítica (time)"}
              subtitle={isAdmin
                ? "Tarefas atrasadas nesta semana — priorize e reatribua."
                : "Tarefas atrasadas do seu time — destrave o time."
              tasks={teamWorkItemMetrics.overdueTasks as DbTaskWithContext[]}
              to="/okr/hoje"
            />
          )}

          {/* =====================================================
             // MANAGEMENT SHORTCUTS (ADMIN/HEAD)
             // ===================================================== */}
          {isAdmin || isHead ? (
            <Card data-tour="dash-management" className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Atalhos de gestão</div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Ações rápidas para destravar pessoas, custos e trilhas.
                  </p>
                </div>
                <Badge className="w-fit rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                  {user.role}
                </Badge>
              </div>

              <Separator className="my-5" />

              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                <Link
                  to="/admin/users"
                  className="group rounded-3xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-5 transition hover:bg-[color:var(--sinaxys-tint)]/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Usuários</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Ativação, roles e permissões.
                      </div>
                    </div>
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]">
                      <Users className="h-5 w-5" />
                    </div>
                  </div>

                  <Link
                    to="/admin/import-users"
                    className="group rounded-3xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-5 transition hover:bg-[color:var(--sinaxys-tint)]/40"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Importar usuários</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          Suba uma planilha e provisione o time rapidamente.
                        </div>
                      </div>
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]">
                        <Users className="h-5 w-5" />
                      </div>
                    </div>
                  </Link>
                </div>

                <Link
                  to="/admin/departments"
                  className="group rounded-3xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-5 transition hover:bg-[color:var(--sinaxys-tint)]/40"
                >
                  <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Departamentos</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          Estrutura do organograma e owners.
                        </div>
                      </div>
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]">
                        <Users className="h-5 w-5" />
                      </div>
                    </div>
                  </Link>

                <Link
                  to="/admin/costs"
                  className="group rounded-3xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-5 transition hover:bg-[color:var(--sinaxys-tint)]/40"
                >
                  <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Custos</div>
                        <div className="mt-1 text-sm text-muted-foreground">
                          Budget, centros de custo e ROI.
                        </div>
                      </div>
                      <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]">
                        <Wallet className="h-5 w-5" />
                      </div>
                    </div>
                  </Link>

                <Link
                  to="/admin/brand"
                  className="group rounded-3xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-5 transition hover:bg-[color:var(--sinaxys-tint)]/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Marca & Módulos</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Personalize a experiência e habilite recursos.
                      </div>
                    </div>
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]">
                      <Building2 className="h-5 w-5" />
                    </div>
                  </div>
                </Link>

                <Link
                  to="/okr/quarter"
                  className="group rounded-3xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-5 transition hover:bg-[color:var(--sinaxys-tint)]/40"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">OKRs do trimestre</div>
                      <div className="mt-1 text-sm text-muted-foreground">
                        Prioridades e saúde da execução.
                      </div>
                    </div>
                    <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]">
                      <Target className="h-5 w-5" />
                    </div>
                  </div>
                </Link>
              </div>
            </Card>
          )}
        </Card>
      </div>
    );
  };
