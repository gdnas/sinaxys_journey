import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { endOfWeek, format, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowRight,
  CalendarCheck2,
  GraduationCap,
  LayoutDashboard,
  MapPinned,
  Network,
  Shield,
  Target,
  Users,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { listTasksForDepartment } from "@/lib/okrDb";
import { listVacationRequestsForApprover } from "@/lib/vacationDb";

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

function ActionCard({
  title,
  desc,
  to,
  icon,
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
      <div className="absolute inset-0 opacity-[0.14]">
        <img src="/placeholder.svg" alt="" className="h-full w-full object-cover" />
      </div>
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

export default function HeadHome() {
  const { user } = useAuth();
  const { company, companyId } = useCompany();

  if (!user) return null;

  const today = new Date();
  const todayLabel = format(today, "EEEE, d 'de' MMMM", { locale: ptBR });
  const todayIso = format(today, "yyyy-MM-dd");
  const weekFrom = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekTo = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");

  const enabled = !!companyId && !!user.departmentId;

  const { data: weekDeptTasks = [] } = useQuery({
    queryKey: ["home-head", "okr-dept", companyId, user.departmentId, weekFrom, weekTo],
    enabled,
    queryFn: () => listTasksForDepartment(String(companyId), String(user.departmentId), { from: weekFrom, to: weekTo }),
  });

  const { data: vacationRows = [] } = useQuery({
    queryKey: ["home-head", "vacation-approvals", companyId],
    enabled: !!companyId,
    queryFn: () => listVacationRequestsForApprover(String(companyId)),
  });

  const { openTasks, overdueTasks, vacationPending } = useMemo(() => {
    const open = weekDeptTasks.filter((t) => t.status !== "DONE");
    const overdue = open.filter((t) => t.due_date && String(t.due_date) < todayIso);
    const vacationPendingCount = vacationRows.filter((r) => r.status === "PENDING").length;
    return { openTasks: open.length, overdueTasks: overdue.length, vacationPending: vacationPendingCount };
  }, [todayIso, weekDeptTasks, vacationRows]);

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
              Minha jornada (Head)
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[color:var(--sinaxys-ink)] sm:text-3xl">
              {company?.name ? company.name : "Seu time"}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {todayLabel}. O foco aqui é execução do seu departamento: riscos, prioridades e atalhos.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button asChild className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
              <Link to="/okr/hoje">
                Ver tarefas
                <Target className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-xl bg-white">
              <Link to="/vacation/approvals">
                Aprovar férias
                <CalendarCheck2 className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <Separator className="my-5" />

        <div className="grid gap-4 lg:grid-cols-3">
          <StatCard
            label="Tarefas abertas"
            value={enabled ? String(openTasks) : "…"}
            hint={`janela ${weekFrom.split("-").reverse().join("/")} → ${weekTo.split("-").reverse().join("/")}`}
            icon={<Target className="h-5 w-5" />}
            to="/okr/hoje"
          />
          <StatCard
            label="Em risco (atrasadas)"
            value={enabled ? String(overdueTasks) : "…"}
            hint="priorize estas primeiro"
            icon={<MapPinned className="h-5 w-5" />}
            to="/okr/hoje"
          />
          <StatCard
            label="Férias — pendentes"
            value={String(vacationPending)}
            hint="no fluxo de aprovações"
            icon={<CalendarCheck2 className="h-5 w-5" />}
            to="/vacation/approvals"
          />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <ActionCard
          title="Organograma"
          desc="Encontre pessoas, veja reporting line e navegue no time."
          to="/org"
          icon={<Network className="h-5 w-5" />}
        />
        <ActionCard
          title="Trilhas do time"
          desc="Publique e acompanhe trilhas do seu departamento."
          to="/head/tracks"
          icon={<GraduationCap className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ActionCard title="Head — Usuários" desc="Acompanhe o time e eventos de acesso." to="/head/users" icon={<Shield className="h-5 w-5" />} />
        <ActionCard title="Pessoas" desc="Abrir perfil e jornada de qualquer pessoa do org." to="/org" icon={<Users className="h-5 w-5" />} />
        <ActionCard title="OKRs do trimestre" desc="Saúde do trimestre e prioridades." to="/okr/quarter" icon={<Target className="h-5 w-5" />} />
        <ActionCard
          title="Férias"
          desc="Aprove ou recuse pedidos quando necessário."
          to="/vacation/approvals"
          icon={<CalendarCheck2 className="h-5 w-5" />}
        />
      </div>
    </div>
  );
}
