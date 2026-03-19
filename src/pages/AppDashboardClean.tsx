import { useMemo } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, CheckCircle2, LayoutDashboard, MapPinned, Network, Sparkles, Target, Trophy, Users, Wallet, Handshake, BookOpen } from "lucide-react";
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
import { VacationSummaryCard } from "@/components/VacationSummaryCard";
import { supabase } from "@/integrations/supabase/client";

// WORK ITEMS - FONTE ÚNICA PARA MÉTRICAS
interface WorkItem {
  id: string;
  tenant_id: string;
  project_id: string | null;
  title: string;
  description: string | null;
  assignee_user_id: string | null;
  created_by_user_id: string;
  priority: "critical" | "high" | "medium" | "low" | null;
  status: "todo" | "in_progress" | "done";
  due_date: string | null;
  start_date: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// Funções simplificadas para buscar work_items
async function listWorkItemsForDashboard(companyId: string): Promise<WorkItem[]> {
  const { data, error } = await supabase
    .from("work_items")
    .select(`
      id, tenant_id, project_id, title, description,
      assignee_user_id, created_by_user_id,
      priority, status, due_date, start_date, completed_at,
      created_at, updated_at
    `)
    .eq("tenant_id", companyId)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as WorkItem[];
}

async function listMyWorkItems(companyId: string, userId: string): Promise<WorkItem[]> {
  const { data, error } = await supabase
    .from("work_items")
    .select(`
      id, tenant_id, project_id, title, description,
      assignee_user_id, created_by_user_id,
      priority, status, due_date, start_date, completed_at,
      created_at, updated_at
    `)
    .eq("tenant_id", companyId)
    .or("assignee_user_id", userId)
    .order("due_date", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as WorkItem[];
}

async function listScopeWorkItems(companyId: string, role: string, departmentId: string | null): Promise<WorkItem[]> {
  const { data, error } = await supabase
    .from("work_items wi")
    .select(`
      wi.id, wi.tenant_id, wi.project_id, wi.title, wi.description,
      wi.assignee_user_id, wi.created_by_user_id,
      wi.priority, wi.status, wi.due_date, wi.start_date, wi.completed_at,
      wi.created_at, wi.updated_at
    `)
    .eq("wi.tenant_id", companyId)
    .order("wi.due_date", { ascending: true, nullsFirst: false })
    .order("wi.created_at", { ascending: false });

  if (error) throw error;

  // Filtra por departamento se for HEAD
  if (role === "HEAD" && departmentId) {
    return data.filter((wi: any) => {
      // Verificar se o projeto pertence ao departamento (via projects ou okr_objectives)
      if (!wi.project_id) return false;

      const projectWorkItems = data.filter((wi: any) => wi.project_id === wi.id);
      if (projectWorkItems.length > 0) return true;

      // Se não tiver project_id, pode ser um work_item direto vinculado ao OKR
      // Por simplicidade, assumimos que se não tem project_id, não é do departamento
      return false;
    });
  }

  // Se for ADMIN ou departamento vazio, retorna tudo
  return data;
}

async function getWorkItemsStats(companyId: string) {
  const { data, error } = await supabase
    .from("work_items")
    .select("status", { count: "exact" })
    .eq("tenant_id", companyId)
    .group("status");

  if (error) throw error;

  const stats: Record<string, number> = {};
  if (data) {
    data.forEach((row: any) => {
      stats[row.status] = row.count;
    });
  }

  return {
    total_work_items: stats["todo"] + stats["in_progress"] + stats["done"] || 0,
    open_work_items: stats["todo"] + stats["in_progress"] || 0,
    completed_work_items: stats["done"] || 0,
    in_progress_work_items: stats["in_progress"] || 0,
    overdue_work_items: 0, // Será calculado no frontend
  };
}

export default function AppDashboardClean() {
  const { user } = useAuth();
  const { company } = useCompany();

  if (!user) return null;

  const companyId = user.companyId ?? null;

  const isCollaborador = user.role === "COLABORADOR";
  const isHead = user.role === "HEAD";
  const isAdmin = user.role === "ADMIN";

  const today = new Date();
  const todayLabel = format(today, "EEEE, d 'de' MMMM", { locale: ptBR });
  const todayIso = format(today, "yyyy-MM-dd");
  const weekFrom = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekTo = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");

  // =====================================================
  // WORK ITEMS PARA MÉTRICAS (FONTE ÚNICA)
  // =====================================================

  // 1. Minhas tarefas (COLABORADOR)
  const { data: myWeekWorkItems = [] } = useQuery({
    queryKey: ["dashboard-my-work-items", companyId, user.id, weekFrom, weekTo],
    enabled: !!companyId,
    queryFn: () => listMyWorkItems(companyId as string, user.id),
  });

  const myOpenWorkItems = useMemo(() => myWeekWorkItems.filter((t: WorkItem) => t.status !== "done"), [myWeekWorkItems]);

  // 2. Tarefas da empresa (ADMIN/HEAD)
  const { data: scopeWorkItems = [] } = useQuery({
    queryKey: ["dashboard-scope-work-items", companyId, user.role, user.departmentId, weekFrom, weekTo],
    enabled: !!companyId && (isHead && !!user.departmentId) || isAdmin,
    queryFn: () => listScopeWorkItems(companyId as string, user.role, user.departmentId),
  });

  const scopeOpenWorkItems = useMemo(() => scopeWorkItems.filter((t: WorkItem) => t.status !== "done"), [scopeWorkItems]);

  const scopeOverdueWorkItems = useMemo(
    () => scopeOpenWorkItems.filter((t: WorkItem) => t.due_date && new Date(t.due_date) < today && t.status !== "done"),
    [scopeOpenWorkItems, todayIso],
  );

  // 3. Estatísticas de work_items
  const { data: workItemStats = {} } = useQuery({
    queryKey: ["dashboard-work-item-stats", companyId],
    enabled: !!companyId,
    queryFn: () => getWorkItemsStats(companyId),
  });

  const myWorkItemMetrics = useMemo(() => {
    const allOpenTasks = myWeekWorkItems.filter((t: WorkItem) => t.status !== "done");

    return {
      allOpenTasks: allOpenTasks.length,
      completedTasks: myWeekWorkItems.filter((t: WorkItem) => t.status === "done").length,
      inProgressTasks: myWeekWorkItems.filter((t: WorkItem) => t.status === "in_progress").length,
      overdueTasks: myWeekWorkItems.filter((t: WorkItem) => t.due_date && new Date(t.due_date) < today && t.status !== "done").length,
    };
  }, [myWeekWorkItems, todayIso, today]);

  const scopeWorkItemMetrics = useMemo(() => {
    if (!scopeWorkItems || scopeWorkItems.length === 0) {
      return { allOpenTasks: 0, completedTasks: 0, inProgressTasks: 0, overdueTasks: 0 };
    }

    const allOpenTasks = scopeWorkItems.filter((t: WorkItem) => t.status !== "done");
    const completedTasks = scopeWorkItems.filter((t: WorkItem) => t.status === "done").length;
    const inProgressTasks = scopeWorkItems.filter((t: WorkItem) => t.status === "in_progress").length;
    const overdueTasks = scopeWorkItems.filter((t: WorkItem) => t.due_date && new Date(t.due_date) < today && t.status !== "done").length;

    return {
      allOpenTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
    };
  }, [scopeWorkItems, todayIso, today]);

  // =====================================================
  // PROJETOS ATIVOS
  // =====================================================
  const { data: activeProjects = [] } = useQuery({
    queryKey: ["dashboard-active-projects", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, status, start_date, due_date, owner_user_id")
        .eq("tenant_id", companyId)
        .in("status", ["not_started", "in_progress", "at_risk", "delayed"])
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });

  const activeProjectsCount = useMemo(() => activeProjects.length, [activeProjects]);

  // =====================================================
  // CÁLCULO DE MÉTRICAS
  // =====================================================
  // 1. Métricas do usuário (baseado em work_items)
  const userMetrics = useMemo(() => {
    if (!myWeekWorkItems || myWeekWorkItems.length === 0) {
      return {
        allOpenTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        overdueTasks: 0,
      };
    }

    const allOpenTasks = myWeekWorkItems.filter((t: WorkItem) => t.status !== "done");
    const completedTasks = myWeekWorkItems.filter((t: WorkItem) => t.status === "done");
    const inProgressTasks = myWeekWorkItems.filter((t: WorkItem) => t.status === "in_progress");
    const overdueTasks = myWeekWorkItems.filter((t: WorkItem) => t.due_date && new Date(t.due_date) < today && t.status !== "done");

    return {
      allOpenTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
    };
  }, [myWeekWorkItems, todayIso, today]);

  // 2. Métricas da equipe (baseado em work_items)
  const teamMetrics = useMemo(() => {
    if (!scopeWorkItems || scopeWorkItems.length === 0) {
      return {
        allOpenTasks: 0,
        completedTasks: 0,
        inProgressTasks: 0,
        overdueTasks: 0,
      };
    }

    const allOpenTasks = scopeWorkItems.filter((t: WorkItem) => t.status !== "done");
    const completedTasks = scopeWorkItems.filter((t: WorkItem) => t.status === "done");
    const inProgressTasks = scopeWorkItems.filter((t: WorkItem) => t.status === "in_progress");
    const overdueTasks = scopeWorkItems.filter((t: WorkItem) => t.due_date && new Date(t.due_date) < today && t.status !== "done");

    return {
      allOpenTasks,
      completedTasks,
      inProgressTasks,
      overdueTasks,
    };
  }, [scopeWorkItems, todayIso, today]);

  // =====================================================
  // PROJETOS DO USUÁRIO
  // =====================================================
  const myProjectIds = useMemo(() => {
    return myWeekWorkItems.filter((t) => t.project_id).map((t) => t.project_id);
  }, [myWeekWorkItems]);

  const myProjectIdsStr = useMemo(() => {
    if (!myProjectIds.length) return "";
    return `'${myProjectIds.join("','")}'`;
  }, [myProjectIds]);

  const { data: myProjects = [] } = useQuery({
    queryKey: ["dashboard-my-projects", companyId, myProjectIdsStr],
    enabled: !!companyId && myProjectIdsStr.length > 0,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("id, name, description, status, start_date, due_date, owner_user_id, key_result_id, deliverable_id")
        .in("id", myProjectIds)
        .eq("tenant_id", companyId)
        .order("due_date", { ascending: true, nullsFirst: false })
        .order("name", { ascending: true });

      if (error) throw error;
      return data ?? [];
    },
  });

  // =====================================================
  // CALCULAR MÉTRICAS DO USUÁRIO
  // =====================================================
  const myProjectMetrics = useMemo(() => {
    if (!myProjects || myProjects.length === 0) {
      return {
        total: 0,
        inProgress: 0,
        done: 0,
        inProgressTasks: 0,
        myWeekTasks: myWeekTasks.length,
      };
    }

    const inProgressProjects = myProjects.filter((p) => p.status === "in_progress");
    const doneProjects = myProjects.filter((p) => p.status === "done");
    const todoProjects = myProjects.filter((p) => p.status === "not_started" || p.status === "at_risk" || p.status === "delayed");

    // Tarefas destes projetos do usuário na semana
    const myProjectIdsList = myProjectIds;

    // Simplificação: assume que work_items da semana são apenas os listados em myWeekWorkItems
    const inProgressTasks = myWorkItemMetrics.inProgressTasks;
    const doneTasks = myWorkItemMetrics.completedTasks;
    const todoTasks = myWorkItemMetrics.allOpenTasks;

    return {
      total: myProjects.length,
      inProgress: inProgressProjects.length,
      done: doneProjects.length,
      inProgressTasks,
      myWeekTasks: myWeekTasks.length,
    };
  }, [myProjects, myWorkItemMetrics, myWeekTasks.length]);

  // =====================================================
  // CALCULAR MÉTRICAS DA EQUIPE (ADMIN/HEAD)
  // =====================================================
  const showTeamMetrics = isHead || isAdmin;

  const teamMetrics = useMemo(() => {
    if (!showTeamMetrics) {
      return null;
    }

    return {
      allOpenTasks: teamMetrics.allOpenTasks,
      completedTasks: teamMetrics.completedTasks,
      inProgressTasks: teamMetrics.inProgressTasks,
      overdueTasks: teamMetrics.overdueTasks,
    };
  }, [showTeamMetrics, teamMetrics]);

  const subtitle = isAdmin
    ? "Visão executiva: saúde do trimestre, execução crítica e atalhos de gestão."
    : isHead
      ? "Visão do time: o que está em risco e o que destrava a semana."
      : "Seus principais atalhos: execução (OKRs), evolução (trilhas) e reconhecimento.";

  const today = new Date();
  const todayLabel = format(today, "EEEE, d 'de' MMMM", { locale: ptBR });
  const todayIso = format(today, "yyyy-MM-dd");

  const weekFrom = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekTo = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");

  // =====================================================
  // 1. MINHAS TAREFAS (SEMPRE COLABORADOR)
  // =====================================================
  const { data: myWeekWorkItems = [] } = useQuery({
    queryKey: ["dashboard-my-tasks", companyId, user.id, weekFrom, weekTo],
    enabled: !!companyId,
    queryFn: () => listMyWorkItems(companyId as string, user.id),
  });

  const myOpenWorkItems = useMemo(() => myWeekWorkItems.filter((t: WorkItem) => t.status !== "done"), [myWeekWorkItems]);

  // =====================================================
  // 2. DASHBOARD HEADER
  // =====================================================
  return (
    <div className="grid gap-6">
      <Card data-tour="dash-hero" className="relative overflow-hidden rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] px-3 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)]">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-white ring-1 ring-[color:var(--sinaxys-border)]">
                <LayoutDashboard className="h-3.5 w-3.5 text-[color:var(--sinaxys-primary)]" />
              </span>
              Minha jornada
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[color:var(--sinaxys-ink)] sm:text-3xl">
              {company?.name ? company.name : "Sua área"}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{todayLabel}. {subtitle}</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between" data-tour="dash-next-action">
            <Button asChild variant="outline" className="h-11 rounded-xl bg-white">
              <Link to={isCollaborador ? "/okr/hoje" : "/okr/quarter"}>
                {isCollaborador ? "Minhas tarefas" : "Ver OKRs"}
                <Target className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        {/* =====================================================
           // MEUS PROJETOS (SÓ COLABORADOR)
           // ===================================================== */}
        {isCollaborador && myProjectMetrics.total > 0 && (
          <div className="grid gap-4 lg:grid-cols-3">
            <StatPill
              label="Tarefas abertas"
              value={`${myProjectMetrics.inProgressTasks}`}
              hint={`${myProjectMetrics.inProgressTasks} tarefas em andamento`}
              icon={<Target className="h-5 w-5" />}
              to="/okr/hoje"
            />

            <StatPill
              label="Concluídos"
              value={`${myProjectMetrics.done}`}
              hint={`${myProjectMetrics.total} projetos`}
              icon={<CheckCircle2 className="h-5 w-5" />}
              to="/okr/hoje"
            />

            <StatPill
              label="Tarefas da semana"
              value={`${myProjectMetrics.myWeekTasks}`}
              hint="toda sua semana"
              icon={<CheckCircle2 className="h-5 w-5" />}
              to="/okr/hoje"
            />
          </div>
        )}

        {/* =====================================================
           // TIME METRICS (SÓ HEAD/ADMIN)
           // ===================================================== */}
        {showTeamMetrics && teamMetrics && (
          <div className="grid gap-4 lg:grid-cols-3">
            <StatPill
              label={isAdmin ? "Empresa — Tarefas abertas" : "Time — Tarefas abertas"}
              value={`${teamMetrics.allOpenTasks}`}
              hint={`Janela ${weekFrom.split("-").reverse().join("/")} → ${weekTo.split("-").reverse().join("/")}`}
              icon={<Target className="h-5 w-5" />}
              to="/okr/hoje"
            />

            <StatPill
              label={isAdmin ? "Empresa — Atrasadas" : "Time — Atrasadas"}
              value={`${teamMetrics.overdueTasks}`}
              hint="Priorize estas primeiro"
              icon={<MapPinned className="h-5 w-5" />}
              to="/okr/hoje"
            />

            <StatPill
              label={isAdmin ? "Empresa — Projetos ativos" : "Time — Projetos ativos"}
              value={activeProjectsCount}
              hint={isAdmin
                ? `${activeProjectsCount} projetos ativos`
                : `${activeProjectsCount} projetos ativos`
              }
              icon={<Target className="h-5 w-5" />}
              to="/app/projetos/dashboard"
            />
          </div>
        )}

        {/* =====================================================
           // SHORTCUTS
           // ===================================================== */}
        <div>
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">O que importa agora</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Acesse rápido os módulos que mais destravam o seu dia.
          </p>

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
                  ? "Ranking, prêmios e recompenças."
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

            {isAdmin || isHead ? <VacationSummaryCard /> : null}
          </div>
        </div>

        {/* =====================================================
           // CRITICAL EXECUTION
           // ===================================================== */}
        {showTeamMetrics && teamMetrics.overdueTasks.length > 0 && (
          <RiskList
            title={isAdmin ? "Execução crítica (empresa)" : "Execução crítica (time)"}
            subtitle={isAdmin
              ? "Tarefas atrasadas nesta semana — priorize e reatribua."
              : "Tarefas atrasadas do seu depto — destrave o time."
            }
            tasks={teamMetrics.overdueTasks as WorkItem[]}
            to="/okr/hoje"
          />
        )}

        {/* =====================================================
           // SHORTCUTS (ADMIN/HEAD)
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
              </Link>

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
          </Card>
        )}
      </div>
    </div>
  );
}
