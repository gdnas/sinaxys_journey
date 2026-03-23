import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowRight,
  Award,
  BookOpen,
  CalendarDays,
  CheckCircle2,
  LayoutDashboard,
  Target,
  Trophy,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { useCompanyModuleEnabled } from "@/hooks/useCompanyModuleEnabled";
import { getAssignmentsForUser } from "@/lib/journeyDb";
import { listTasksForUser } from "@/lib/okrDb";
import { AnnouncementsHomeWidget } from "@/components/AnnouncementsHomeWidget";
import { BirthdayHomeWidget } from "@/components/BirthdayHomeWidget";

function formatPts(n: number) {
  return new Intl.NumberFormat("pt-BR").format(Math.round(n));
}

function StatCard({
  label,
  value,
  hint,
  icon,
  to,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
  to: string;
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
}: {
  title: string;
  desc: string;
  to: string;
  icon: React.ReactNode;
  badge?: string;
}) {
  return (
    <Card className="group relative overflow-hidden rounded-3xl border-[color:var(--sinaxys-border)] bg-white">
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

export default function CollaboratorHome() {
  const { user } = useAuth();
  const { company, companyId } = useCompany();
  const { enabled: internalCommunicationEnabled } = useCompanyModuleEnabled("INTERNAL_COMMUNICATION");

  if (!user) return null;

  const today = new Date();
  const todayLabel = format(today, "EEEE, d 'de' MMMM", { locale: ptBR });

  const { data: assignments = [], isLoading: loadingAssignments } = useQuery({
    queryKey: ["home-collab", "assignments", user.id],
    queryFn: () => getAssignmentsForUser(user.id),
  });

  const inProgress = assignments.filter((a) => a.assignment.status !== "COMPLETED");
  const completed = assignments.filter((a) => a.assignment.status === "COMPLETED");

  const next = inProgress
    .slice()
    .sort((a, b) => (b.assignment.started_at ?? b.assignment.assigned_at).localeCompare(a.assignment.started_at ?? a.assignment.assigned_at))[0];

  const { data: myWeekTasks = [] } = useQuery({
    queryKey: ["home-collab", "okr-my-week", companyId, user.id],
    enabled: !!companyId,
    queryFn: () => listTasksForUser(String(companyId), user.id, {}),
  });

  const openTasks = useMemo(() => myWeekTasks.filter((t) => t.status !== "DONE").length, [myWeekTasks]);

  const heroPrimary = next ? "Continuar trilha" : "Explorar trilhas";
  const heroPrimaryTo = next ? `/app/tracks/${next.assignment.id}` : "/tracks";

  return (
    <div className="grid gap-6">
      <Card className="relative overflow-hidden rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] px-3 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)]">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-white ring-1 ring-[color:var(--sinaxys-border)]">
                <LayoutDashboard className="h-3.5 w-3.5 text-[color:var(--sinaxys-primary)]" />
              </span>
              Minha jornada
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[color:var(--sinaxys-ink)] sm:text-3xl">
              {company?.name ? company.name : "Seu espaço"}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{todayLabel}. Seus atalhos de execução, evolução e reconhecimento.</p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button asChild className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
              <Link to={heroPrimaryTo}>
                {heroPrimary}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-xl bg-white">
              <Link to="/okr/hoje">
                Minhas tarefas
                <Target className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <Separator className="my-5" />

        <div className="grid gap-4 lg:grid-cols-3">
          <StatCard label="Tarefas abertas" value={String(openTasks)} hint="para você" icon={<Target className="h-5 w-5" />} to="/okr/hoje" />
          <StatCard label="Trilhas" value={loadingAssignments ? "…" : String(inProgress.length)} hint={inProgress.length ? "em andamento" : `${completed.length} concluídas`} icon={<CheckCircle2 className="h-5 w-5" />} to={inProgress.length ? "/app" : "/tracks"} />
          <StatCard label="Points" value={formatPts(0)} hint="veja o ranking" icon={<Trophy className="h-5 w-5" />} to="/rankings" />
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
              <Progress
                value={next.totalModules ? Math.round((next.completedModules / next.totalModules) * 100) : 0}
                className="h-2"
              />
            </div>
          </div>
        ) : null}
      </Card>

      {internalCommunicationEnabled && (
        <div className="grid gap-4 lg:grid-cols-2">
          <AnnouncementsHomeWidget />
          <BirthdayHomeWidget />
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <ShortcutCard title="Trilhas" desc="Continue ou encontre novas trilhas para evoluir." to="/tracks" icon={<BookOpen className="h-5 w-5" />} />
        <ShortcutCard title="Certificados" desc="Veja certificados e compartilhe conquistas." to="/app/certificates" icon={<Award className="h-5 w-5" />} />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ShortcutCard title="Minhas tarefas" desc="Rotina diária ligada aos OKRs." to="/okr/hoje" icon={<Target className="h-5 w-5" />} />
        <ShortcutCard title="Indisponibilidade" desc="Crie e acompanhe suas solicitações." to="/vacation" icon={<CalendarDays className="h-5 w-5" />} />
        <ShortcutCard title="Ranking" desc="Acompanhe Points e suba no ranking." to="/rankings" icon={<Trophy className="h-5 w-5" />} />
        <ShortcutCard title="Trilha atual" desc={next ? "Voltar para onde você parou." : "Comece uma trilha agora."} to={heroPrimaryTo} icon={<ArrowRight className="h-5 w-5" />} />
      </div>
    </div>
  );
}