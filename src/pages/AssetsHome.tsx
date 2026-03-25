import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import {
  Box,
  Briefcase,
  AlertTriangle,
  Clock,
  DollarSign,
  FileText,
  Users,
  Wrench,
  CheckCircle,
  TrendingDown,
  Percent,
  Calendar,
} from "lucide-react";
import { useCompany } from "@/lib/company";
import { useAuth } from "@/lib/auth";
import { getAssetsDashboardStats } from "@/lib/assetsDb";
import { RequireAuth } from "@/components/RequireAuth";
import { RequireCompanyModule } from "@/components/RequireCompanyModule";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

// =====================
// SUBCOMPONENTS
// =====================

function StatCard({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] ring-1 ring-[color:var(--sinaxys-border)]">
          {icon}
        </div>
        <div className="flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="text-2xl font-bold text-[color:var(--sinaxys-ink)]">
            {typeof value === "number" ? value.toLocaleString("pt-BR") : value}
          </div>
        </div>
      </div>
    </div>
  );
}

function FinancialCard({
  icon,
  label,
  value,
  isPercentage,
}: {
  icon: React.ReactNode;
  label: string;
  value: number | string;
  isPercentage?: boolean;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4">
      <div className="flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] ring-1 ring-[color:var(--sinaxys-border)]">
          {icon}
        </div>
        <div className="flex-1">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="text-2xl font-bold text-[color:var(--sinaxys-ink)]">
            {isPercentage && typeof value === "number"
              ? `${value}%`
              : typeof value === "number"
                ? `R$ ${value.toLocaleString("pt-BR")}`
                : value}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailCard({
  icon,
  label,
  items,
}: {
  icon: React.ReactNode;
  label: string;
  items: number | string;
}) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4">
      <div className="flex items-start gap-3">
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] ring-1 ring-[color:var(--sinaxys-border)]">
          {icon}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="text-2xl font-bold text-[color:var(--sinaxys-ink)]">
            {items}
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertItem({
  icon,
  severity,
  message,
  action,
}: {
  icon: React.ReactNode;
  severity: "high" | "medium" | "low";
  message: string;
  action?: React.ReactNode;
}) {
  const severityColors = {
    high: "bg-red-50 text-red-700 border-red-200",
    medium: "bg-yellow-50 text-yellow-700 border-yellow-200",
    low: "bg-green-50 text-green-700 border-green-200",
  };

  return (
    <div className={`flex items-start gap-3 rounded-2xl border p-4 ${severityColors[severity]}`}>
      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white">
        {icon}
      </div>
      <div className="flex-1">
        <div className="text-xs font-semibold uppercase tracking-wide text-current-color">
          {severity.toUpperCase()}
        </div>
        <div className="text-sm text-current-color">
          {message}
        </div>
        {action && <div className="mt-2">{action}</div>}
      </div>
    </div>
  );
}

// =====================
// MAIN COMPONENT
// =====================

export function AssetsHome() {
  const { companyId } = useCompany();
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      if (!companyId) return;

      setLoading(true);
      try {
        const data = await getAssetsDashboardStats(companyId);
        setStats(data);
      } catch (error) {
        console.error("Error loading stats:", error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [companyId]);

  const canManage = user?.role === "MASTERADMIN" || user?.role === "ADMIN" || user?.role === "HEAD";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-[color:var(--sinaxys-ink)]">Gestão de Ativos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Visão geral do patrimônio da empresa
          </p>
        </div>
        {canManage && (
          <Button className="rounded-2xl" variant="outline" asChild>
            <Link to="/app/ativos/novo">
              <Briefcase className="mr-2 h-4 w-4" />
              Novo Ativo
            </Link>
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
            <Card key={i} className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
              <Skeleton className="h-20 w-full" />
            </Card>
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Ativos */}
            <StatCard icon={<Box className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />} label="Total de Ativos" value={stats?.total_assets || 0} />
            <StatCard icon={<Clock className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />} label="Em Estoque" value={stats?.total_in_stock || 0} />
            <StatCard icon={<Users className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />} label="Em Uso" value={stats?.total_in_use || 0} />
            <StatCard icon={<AlertTriangle className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />} label="Ocorrências" value={stats?.total_lost || 0} />
            <StatCard icon={<Wrench className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />} label="Em Manutenção" value={stats?.total_in_maintenance || 0} />
            <StatCard icon={<FileText className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />} label="Adquiridos" value={stats?.total_acquired_by_user || 0} />
          </div>

          {/* Financeiro */}
          <div className="md:col-span-2 lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] ring-1 ring-[color:var(--sinaxys-border)]">
                <DollarSign className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
              </div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Valor Patrimonial</div>
            </div>

            <FinancialCard
              icon={<DollarSign className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />}
              label="Valor de Aquisição Total"
              value={stats?.total_purchase_value || 0}
            />
            <FinancialCard
              icon={<TrendingDown className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />}
              label="Valor Residual Total"
              value={stats?.total_residual_value || 0}
            />
            <FinancialCard
              icon={<Percent className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />}
              label="Depreciação Acumulada"
              value={stats?.total_purchase_value && stats?.total_residual_value
                ? ((stats.total_purchase_value - stats.total_residual_value) / stats.total_purchase_value) * 100
                : 0
              }
              isPercentage
            />
          </div>

          {/* Pendências */}
          <div className="md:col-span-2 lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] ring-1 ring-[color:var(--sinaxys-border)]">
                <AlertTriangle className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
              </div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Pendências</div>
            </div>

            <DetailCard
                          icon={<Users className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />}
                          label="Sem Responsável"
                          items={stats?.assets_without_assignee || 0}
                        />
                        <DetailCard
                          icon={<Calendar className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />}
                          label="Devolução Pendente"
                          items={stats?.assets_pending_return || 0}
                        />
                        <DetailCard
                          icon={<FileText className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />}
                          label="Sem Nota Fiscal"
                          items={stats?.total_pending_documentation || 0}
                        />
                        <DetailCard
                          icon={<Wrench className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />}
                          label="Sem Documento Assinado"
                          items={stats?.assets_without_signed_document || 0}
                        />
          </div>

          {/* Alertas Operacionais */}
          <div className="md:col-span-2 lg:col-span-2 space-y-4">
            <div className="flex items-center gap-3 mb-4">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] ring-1 ring-1 ring-[color:var(--sinaxys-border)]">
                <AlertTriangle className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
              </div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Alertas Operacionais</div>
            </div>

            {stats?.assets_with_incidents_without_resolution > 0 && (
              <AlertItem
                icon={<AlertTriangle className="h-5 w-5" />}
                severity="high"
                message="Ocorrências em Análise"
                action={<Link to="/app/ativos">Ver Detalhes</Link>}
              />
            )}
            {stats?.assets_idle_in_stock_over_30_days > 0 && (
              <AlertItem
                icon={<Clock className="h-5 w-5" />}
                severity="low"
                message="Ativos parados por mais de 30 dias"
                action={<Link to="/app/ativos">Gerenciar</Link>}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}

// Wrapper com verificação de autenticação e módulo
function AssetsHomeWrapper() {
  return (
    <RequireAuth roles={["MASTERADMIN", "ADMIN", "HEAD", "COLABORADOR"]}>
      <RequireCompanyModule moduleKey="ASSETS">
        <AssetsHome />
      </RequireCompanyModule>
    </RequireAuth>
  );
}

export default AssetsHomeWrapper;