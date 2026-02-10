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
import { computeProgress } from "@/lib/sinaxys";
import { getAssignmentsForUser } from "@/lib/journeyDb";
import { fetchLeaderboard } from "@/lib/pointsDb";
import { listTasksForUser } from "@/lib/okrDb";

function formatPts(n: number) {
  return new Intl.NumberFormat("pt-BR").format(Math.round(n));
}

function StatPill({
  label,
  value,
  icon,
  to,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
  to: string;
  hint?: string;
}) {
  return (
    <Card className="group rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5 transition hover:bg-[color:var(--sinaxys-tint)]/30">
      <Link to={to} className="block">
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
  img,
}: {
  title: string;
  desc: string;
  icon: React.ReactNode;
  to: string;
  badge?: string;
  img?: string;
}) {
  return (
    <Card className="group relative overflow-hidden rounded-3xl border-[color:var(--sinaxys-border)] bg-white">
      {img ? (
        <div className="absolute inset-0 opacity-[0.18]">
          <img src={img} alt="" className="h-full w-full object-cover" />
        </div>
      ) : null}
      <Link to={to} className="relative block p-6">
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

export default function AppDashboard() {
  const { user } = useAuth();
  const { company } = useCompany();

  if (!user) return null;

  const companyId = user.companyId ?? null;

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
  const weekFrom = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekTo = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");

  const { data: myWeekTasks = [] } = useQuery({
    queryKey: ["okr-my-tasks", companyId, user.id, weekFrom, weekTo],
    enabled: !!companyId,
    queryFn: () => listTasksForUser(companyId as string, user.id, { from: weekFrom, to: weekTo }),
  });

  const openTasks = useMemo(() => myWeekTasks.filter((t) => t.status !== "DONE"), [myWeekTasks]);

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

  const isAdminish = user.role === "ADMIN" || user.role === "HEAD";

  return (
    <div className="grid gap-6">
      <Card className="relative overflow-hidden rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="absolute inset-0 opacity-[0.16]">
          <img src="/placeholder.svg" alt="" className="h-full w-full object-cover" />
        </div>
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
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {todayLabel}. Aqui estão seus principais atalhos: execução (OKRs), evolução (trilhas) e reconhecimento (Points).
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
              <Link to="/profile">
                Minha área
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <Separator className="my-5" />

        <div className="grid gap-4 lg:grid-cols-3">
          <StatPill
            label="OKRs — tarefas abertas"
            value={`${openTasks.length}`}
            hint="na sua semana"
            icon={<Target className="h-5 w-5" />}
            to="/okr/hoje"
          />
          <StatPill
            label="Sinaxys Points"
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
          <ShortcutCard
            title="OKRs"
            desc="Prioridades do dia, mapa estratégico e ciclos do trimestre."
            icon={<MapPinned className="h-5 w-5" />}
            to="/okr"
            badge="execução"
            img="/placeholder.svg"
          />
          <ShortcutCard
            title="Trilhas"
            desc="Aprendizado em sequência: onboarding, trilhas estratégicas e módulos."
            icon={<BookOpen className="h-5 w-5" />}
            to="/tracks"
            badge="evolução"
            img="/placeholder.svg"
          />
          <ShortcutCard
            title="Sinaxys Points"
            desc="Ranking, tiers e recompensas. Veja sua evolução na empresa."
            icon={<Sparkles className="h-5 w-5" />}
            to="/rankings"
            badge="reconhecimento"
            img="/placeholder.svg"
          />
          <ShortcutCard
            title="Empresa"
            desc="Organograma e contexto da sua organização."
            icon={<Network className="h-5 w-5" />}
            to="/org"
            badge="contexto"
            img="/placeholder.svg"
          />
        </div>
      </div>

      {isAdminish ? (
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
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

          <div className="grid gap-4 md:grid-cols-3">
            {user.role === "ADMIN" ? (
              <>
                <Button asChild variant="outline" className="h-11 justify-start rounded-2xl bg-white">
                  <Link to="/admin/users">
                    <Users className="mr-2 h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                    Usuários
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-11 justify-start rounded-2xl bg-white">
                  <Link to="/admin/costs">
                    <Wallet className="mr-2 h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                    Custos
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-11 justify-start rounded-2xl bg-white">
                  <Link to="/admin/tracks">
                    <Building2 className="mr-2 h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                    Montar trilhas
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button asChild variant="outline" className="h-11 justify-start rounded-2xl bg-white">
                  <Link to="/head/users">
                    <Users className="mr-2 h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                    Pessoas
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-11 justify-start rounded-2xl bg-white">
                  <Link to="/head/costs">
                    <Wallet className="mr-2 h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                    Custos
                  </Link>
                </Button>
                <Button asChild variant="outline" className="h-11 justify-start rounded-2xl bg-white">
                  <Link to="/head/tracks">
                    <Building2 className="mr-2 h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                    Trilhas do time
                  </Link>
                </Button>
              </>
            )}
          </div>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Button asChild variant="outline" className="h-11 justify-start rounded-2xl bg-white">
              <Link to="/app/certificates">
                <Award className="mr-2 h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                Certificados
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 justify-start rounded-2xl bg-white">
              <Link to="/okr/ciclos">
                <Target className="mr-2 h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                Ciclos & OKRs
              </Link>
            </Button>
          </div>
        </Card>
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
    </div>
  );
}