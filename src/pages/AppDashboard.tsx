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
          <ArrowRight className="h-4 w-4" />
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
    .sort((a, b) => (b.assignment.started_at ?? b.assignment.assigned_at).localeCompare(a.assignment.started_at ?? a.assignment.assigned_at))[0];

  const today = new Date();
  const todayLabel = format(today, "EEEE, d 'de' MMMM", { locale: ptBR });
  const todayIso = format(today, "yyyy-MM-dd");
  const weekFrom = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekTo = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");

  // My tasks (always useful)
  const { data: myWeekTasks = [] } = useQuery({
    queryKey: ["okr-my-tasks", companyId, user.id, weekFrom, weekTo],
    enabled: !!companyId,
    queryFn: () => listTasksForUser(user.id, weekFrom, weekTo),
  });

  const myOpenTasks = useMemo(() => myWeekTasks.filter((t) => t.status !== "DONE"), [myWeekTasks]);

  // Team/company tasks (for HEAD/ADMIN)
  const { data: scopeTasks = [] } = useQuery({
    queryKey: ["okr-scope-tasks", companyId, user.role, user.departmentId, weekFrom, weekTo],
    enabled: !!companyId && ((isHead && !!user.departmentId) || isAdmin),
    queryFn: () => {
      if (isAdmin) return listTasksForCompany(companyId as string, weekFrom, weekTo);
      return listTasksForDepartment(companyId as string, user.departmentId as string, weekFrom, weekTo);
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
    queryFn: () => listOkrObjectivesByCycle(companyId as string, String(activeQuarter?.id)),
  });

  const scopedObjectives = useMemo(() => {
    if (isAdmin) return quarterObjectives;
    if (isHead) return quarterObjectives.filter((o) => o.department_id === user.departmentId);
    return [];
  }, [quarterObjectives, isAdmin, isHead, user.departmentId]);

  const objectivesByLevel = useMemo(() => {
    const m = new Map<string, number>();
    for (const o of scopedObjectives) m.set(o.level, (m.get(o.level) ?? 0) + 1);
    return m;
  }, [scopedObjectives]);

  // Points (lightweight identity/engagement)
  const { data: leaderboard = [] } = useQuery({
    queryKey: ["points", "leaderboard", companyId],
    enabled: !!companyId,
    queryFn: () => fetchLeaderboard(companyId as string, 50),
  });

  const { myPoints, myRank } = useMemo(() => {
    const mine = leaderboard.find((r) => r.user_id === user.id);
    const idx = leaderboard.findIndex((r) => r.user_id === user.id);
    return { myPoints: mine?.total_points ?? 0, myRank: idx >= 0 ? idx + 1 : null };
  }, [leaderboard, user.id]);

  const subtitle = isAdmin
    ? "Visão executiva: saúde do trimestre, execução crítica e atalhos de gestão."
    : isHead
      ? "Visão do time: o que está em risco e o que destrava a semana."
      : "Seus principais atalhos: execução (OKRs), evolução (trilhas) e reconhecimento (Points).";

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

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center" data-tour="dash-next-action">
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
              <Link to={isCollaborator ? "/okr/hoje" : "/okr/quarter"}>
                {isCollaborator ? "Minhas tarefas" : "Ver OKRs"}
                <Target className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <Separator className="my-5" />

        <div className="grid gap-4 lg:grid-cols-3">
          {isCollaborator ? (
            <>
              <StatPill
                label="OKRs — tarefas abertas"
                value={`${myOpenTasks.length}`}
                hint="na sua semana"
                icon={<Target className="h-5 w-5" />}
                to="/okr/hoje"
              />
              <StatPill
                label="Points"
                value={formatPts(myPoints)}
                hint={myRank ? `posição #${myRank} (Top 50)` : "entre no ranking"}
                icon={<Trophy className="h-5 w-5" />}
                to="/rankings"
              />
              <StatPill
                label="Trilhas"
                value={loadingAssignments ? "…" : `${inProgress.length}`}
                hint={loadingAssignments ? "carregando" : inProgress.length ? "em andamento" : `${completed.length} concluídas`}
                icon={<CheckCircle2 className="h-5 w-5" />}
                to={inProgress.length ? "/app" : "/tracks"}
              />
            </>
          ) : (
            <>
              <StatPill
                label={isAdmin ? "Empresa — tarefas abertas" : "Time — tarefas abertas"}
                value={`${scopeOpenTasks.length}`}
                hint={`janela ${weekFrom.split("-").reverse().join("/")} → ${weekTo.split("-").reverse().join("/")}`}
                icon={<Target className="h-5 w-5" />}
                to="/okr/hoje"
              />
              <StatPill
                label="Em risco (atrasadas)"
                value={`${scopeOverdueTasks.length}`}
                hint="priorize estas primeiro"
                icon={<MapPinned className="h-5 w-5" />}
                to="/okr/hoje"
              />
              <StatPill
                label="Objetivos do trimestre"
                value={activeQuarter ? `${scopedObjectives.length}` : "—"}
                hint={
                  activeQuarter
                    ? isAdmin
                      ? `Empresa: COMPANY ${objectivesByLevel.get("COMPANY") ?? 0} • DEPT ${objectivesByLevel.get("DEPARTMENT") ?? 0}`
                      : `Seu depto: ${scopedObjectives.length}`
                    : "Nenhum ciclo trimestral ativo"
                }
                icon={<CheckCircle2 className="h-5 w-5" />}
                to="/okr/quarter"
              />
            </>
          )}
        </div>

        {next ? (
          <div className="mt-5 rounded-3xl border border-[color:var(--sinaxys-border)] bg-white/80 p-5 backdrop-blur">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Próxima etapa</div>
                <div className="mt-1 truncate text-sm text-muted-foreground">{next.track.title}</div>
              </div>
              <Badge className="w-fit rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                {next.completedModules} de {next.totalModules} módulos
              </Badge>
            </div>
            <div className="mt-3">
              <Progress value={computeProgress(next.completedModules, next.totalModules)} className="h-2 rounded-full bg-[color:var(--sinaxys-tint)]" />
            </div>
          </div>
        ) : null}
      </Card>

      <div>
        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">O que importa agora</div>
        <p className="mt-1 text-sm text-muted-foreground">Acesse rápido os módulos que mais destravam o seu dia.</p>

        <div className="mt-4 grid gap-6 md:grid-cols-2">
          {pdiEnabled ? (
            <ShortcutCard
              title="PDI & Performance"
              desc={isAdmin ? "Acompanhe pessoas: check-ins, 1:1 e alertas leves." : isHead ? "Ritmo do time: check-ins, 1:1 e evolução." : "Seu PDI, seus check-ins e seu histórico de evolução."}
              icon={<Handshake className="h-5 w-5" />}
              to="/pdi-performance"
              badge="pessoas"
              tourId="dash-pdi"
            />
          ) : null}
          <ShortcutCard
            title="OKRs"
            desc={isAdmin ? "Saúde do trimestre: objetivos, KRs, entregáveis e tarefas." : isHead ? "OKRs do seu departamento e execução do time." : "Suas prioridades do dia e da semana."}
            icon={<MapPinned className="h-5 w-5" />}
            to={isCollaborator ? "/okr/hoje" : "/okr/quarter"}
            badge="execução"
            tourId="dash-okr"
          />
          <ShortcutCard
            title="Trilhas"
            desc={isHead ? "Acompanhe trilhas do time e delegações." : "Aprendizado em sequência: onboarding e trilhas estratégicas."}
            icon={<BookOpen className="h-5 w-5" />}
            to={isHead ? "/head/tracks" : "/tracks"}
            badge="evolução"
            tourId="dash-trilhas"
          />
          <ShortcutCard
            title="Points"
            desc={isAdmin ? "Engajamento e regras de pontuação." : "Ranking, prêmios e recompensas."}
            icon={<Sparkles className="h-5 w-5" />}
            to={isAdmin ? "/rankings?tab=rules" : "/rankings"}
            badge="reconhecimento"
            tourId="dash-points"
          />
          <ShortcutCard
            title={isAdmin ? "Empresa" : isHead ? "Time" : "Empresa"}
            desc={isHead ? "Organograma e pessoas do seu contexto." : "Organograma e contexto da sua organização."}
            icon={<Network className="h-5 w-5" />}
            to="/org"
            badge="contexto"
            tourId="dash-org"
          />
          {isAdmin || isHead ? <VacationSummaryCard /> : null}
        </div>
      </div>

      {isHead || isAdmin ? (
        <RiskList
          title={isAdmin ? "Execução crítica (empresa)" : "Execução crítica (time)"}
          subtitle={isAdmin ? "Tarefas atrasadas nesta semana — priorize e reatribua." : "Tarefas atrasadas do seu depto — destrave o time."}
          tasks={scopeOverdueTasks}
          to="/okr/hoje"
        />
      ) : (
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Seus certificados</div>
              <p className="mt-1 text-sm text-muted-foreground">O histórico do que você concluiu (e o que vale mostrar).</p>
            </div>
            <Button asChild variant="outline" className="h-11 rounded-xl bg-white">
              <Link to="/app/certificates">
                Abrir certificados
                <Award className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </Card>
      )}

      {isAdmin || isHead ? (
        <Card data-tour="dash-management" className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Atalhos de gestão</div>
              <p className="mt-1 text-sm text-muted-foreground">Ações rápidas para destravar pessoas, custos e trilhas.</p>
            </div>
            <Badge className="w-fit rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
              {user.role}
            </Badge>
          </div>

          <Separator className="my-5" />

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            <Link
              to="/admin/users"
              className="group rounded-3xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-5 transition hover:bg-[color:var(--sinaxys-tint)]/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Usuários</div>
                  <div className="mt-1 text-sm text-muted-foreground">Ativação, roles e permissões.</div>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--sinaxys-primary)]">
                Abrir
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>

            <Link
              to="/admin/import-users"
              className="group rounded-3xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-5 transition hover:bg-[color:var(--sinaxys-tint)]/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Importar usuários</div>
                  <div className="mt-1 text-sm text-muted-foreground">Suba uma planilha e provisiona o time rapidamente.</div>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--sinaxys-primary)]">
                Abrir
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>

            <Link
              to="/admin/departments"
              className="group rounded-3xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-5 transition hover:bg-[color:var(--sinaxys-tint)]/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Departamentos</div>
                  <div className="mt-1 text-sm text-muted-foreground">Estrutura do organograma e owners.</div>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]">
                  <Users className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--sinaxys-primary)]">
                Abrir
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>

            <Link
              to="/admin/costs"
              className="group rounded-3xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-5 transition hover:bg-[color:var(--sinaxys-tint)]/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Custos</div>
                  <div className="mt-1 text-sm text-muted-foreground">Budget, centros de custo e ROI.</div>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]">
                  <Wallet className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--sinaxys-primary)]">
                Abrir
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>

            <Link
              to="/admin/brand"
              className="group rounded-3xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-5 transition hover:bg-[color:var(--sinaxys-tint)]/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Marca & Módulos</div>
                  <div className="mt-1 text-sm text-muted-foreground">Personalize a experiência e habilite recursos.</div>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]">
                  <Building2 className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--sinaxys-primary)]">
                Abrir
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>

            <Link
              to="/okr/quarter"
              className="group rounded-3xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-5 transition hover:bg-[color:var(--sinaxys-tint)]/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">OKRs do trimestre</div>
                  <div className="mt-1 text-sm text-muted-foreground">Prioridades e saúde da execução.</div>
                </div>
                <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] ring-1 ring-[color:var(--sinaxys-border)]">
                  <Target className="h-5 w-5" />
                </div>
              </div>
              <div className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--sinaxys-primary)]">
                Abrir
                <ArrowRight className="h-4 w-4" />
              </div>
            </Link>
          </div>
        </Card>
      ) : null}
    </div>
  );
}