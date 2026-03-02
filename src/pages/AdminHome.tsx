import { Link } from "react-router-dom";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { endOfWeek, format, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowRight,
  Building2,
  CalendarCheck2,
  GraduationCap,
  LayoutDashboard,
  Settings2,
  Shield,
  Target,
  UploadCloud,
  Users,
  Wand2,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCompany } from "@/lib/company";
import { listTasksForCompany } from "@/lib/okrDb";
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

export default function AdminHome() {
  const { company, companyId } = useCompany();

  const today = new Date();
  const todayLabel = format(today, "EEEE, d 'de' MMMM", { locale: ptBR });
  const weekFrom = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekTo = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");

  const enabled = !!companyId;

  const { data: weekCompanyTasks = [] } = useQuery({
    queryKey: ["home-admin", "okr-company", companyId, weekFrom, weekTo],
    enabled,
    queryFn: () => listTasksForCompany(String(companyId), { from: weekFrom, to: weekTo }),
  });

  const { data: vacationRows = [] } = useQuery({
    queryKey: ["home-admin", "vacation-approvals", companyId],
    enabled,
    queryFn: () => listVacationRequestsForApprover(String(companyId)),
  });

  const { openTasks, overdueTasks, vacationPending } = useMemo(() => {
    const open = weekCompanyTasks.filter((t) => t.status !== "DONE");
    const overdue = open.filter((t) => t.due_date && String(t.due_date) < format(today, "yyyy-MM-dd"));
    const vacationPendingCount = vacationRows.filter((r) => r.status === "PENDING").length;
    return { openTasks: open.length, overdueTasks: overdue.length, vacationPending: vacationPendingCount };
  }, [today, weekCompanyTasks, vacationRows]);

  return (
    <div className="grid gap-6">
      <Card className="relative overflow-hidden rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="relative flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] px-3 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)]">
              <span className="grid h-5 w-5 place-items-center rounded-full bg-white ring-1 ring-[color:var(--sinaxys-border)]">
                <LayoutDashboard className="h-3.5 w-3.5 text-[color:var(--sinaxys-primary)]" />
              </span>
              Início
            </div>

            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-[color:var(--sinaxys-ink)] sm:text-3xl">
              {company?.name ? company.name : "Sua empresa"}
            </h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              {todayLabel}. Visão rápida de execução, pendências e atalhos de gestão.
            </p>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button asChild className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
              <Link to="/okr/quarter">
                Ver OKRs do trimestre
                <Target className="ml-2 h-4 w-4" />
              </Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-xl bg-white">
              <Link to="/admin/users">
                Gerenciar usuários
                <Users className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>
        </div>

        <Separator className="my-5" />

        <div className="grid gap-4 lg:grid-cols-3">
          <StatCard
            label="Férias — pendentes"
            value={enabled ? String(vacationPending) : "…"}
            hint="aprovações aguardando"
            icon={<CalendarCheck2 className="h-5 w-5" />}
            to="/vacation/approvals"
          />
          <StatCard
            label="OKRs — tarefas abertas"
            value={enabled ? String(openTasks) : "…"}
            hint={`janela ${weekFrom.split("-").reverse().join("/")} → ${weekTo.split("-").reverse().join("/")}`}
            icon={<Target className="h-5 w-5" />}
            to="/okr/hoje"
          />
          <StatCard
            label="Em risco (atrasadas)"
            value={enabled ? String(overdueTasks) : "…"}
            hint="priorize estas primeiro"
            icon={<Target className="h-5 w-5" />}
            to="/okr/hoje"
          />
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <ActionCard
          title="Empresa"
          desc="Usuários, importação, departamentos e marca/módulos."
          to="/admin/users"
          icon={<Building2 className="h-5 w-5" />}
        />
        <ActionCard
          title="Trilhas"
          desc="Monte trilhas e publique para acelerar a evolução do time."
          to="/admin/tracks"
          icon={<GraduationCap className="h-5 w-5" />}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <ActionCard title="Usuários" desc="Ativação, roles e permissões." to="/admin/users" icon={<Shield className="h-5 w-5" />} />
        <ActionCard
          title="Importar usuários"
          desc="Suba uma planilha e provisiona o time rapidamente."
          to="/admin/import-users"
          icon={<UploadCloud className="h-5 w-5" />}
        />
        <ActionCard
          title="Departamentos"
          desc="Estrutura do organograma e owners."
          to="/admin/departments"
          icon={<Wand2 className="h-5 w-5" />}
        />
        <ActionCard
          title="Marca & Módulos"
          desc="Personalize a experiência e habilite recursos."
          to="/admin/brand"
          icon={<Settings2 className="h-5 w-5" />}
        />
      </div>
    </div>
  );
}