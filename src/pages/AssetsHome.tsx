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

export default function AssetsHome() {
  const { companyId } = useCompany();
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadStats() {
      if (!companyId) return;

      try {
        const data = await getAssetsDashboardStats(companyId);
        setStats(data);
      } catch (error) {
        console.error("Error loading assets stats:", error);
      } finally {
        setLoading(false);
      }
    }

    loadStats();
  }, [companyId]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    );
  }

  const canManage = user?.role === "MASTERADMIN" || user?.role === "ADMIN";

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-[color:var(--sinaxys-ink)]">Gestão de Ativos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Controle patrimonial, cessão e devolução de equipamentos
          </p>
        </div>
        {canManage && (
          <Button
            className="rounded-2xl bg-[color:var(--sinaxys-primary)] text-white"
            asChild
          >
            <Link to="/app/ativos/novo">Cadastrar Ativo</Link>
          </Button>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          icon={Box}
          label="Total de ativos"
          value={stats?.total_assets || 0}
          color="blue"
        />
        <StatCard
          icon={Briefcase}
          label="Em uso"
          value={stats?.total_in_use || 0}
          color="green"
        />
        <StatCard
          icon={Box}
          label="Em estoque"
          value={stats?.total_in_stock || 0}
          color="orange"
        />
        <StatCard
          icon={AlertTriangle}
          label="Pendências"
          value={stats?.assets_pending_return + stats?.assets_without_signed_document || 0}
          color="red"
        />
      </div>

      {/* Financial Stats */}
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-[color:var(--sinaxys-ink)]">Patrimônio</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <FinancialCard
            icon={DollarSign}
            label="Valor total de aquisição"
            value={stats?.total_purchase_value || 0}
          />
          <FinancialCard
            icon={TrendingDown}
            label="Valor residual total"
            value={stats?.total_residual_value || 0}
          />
          <FinancialCard
            icon={PercentBadge}
            label="Depreciação acumulada"
            value={
              stats?.total_purchase_value && stats?.total_residual_value
                ? ((stats.total_purchase_value - stats.total_residual_value) / stats.total_purchase_value) * 100
                : 0
            }
            isPercentage
          />
        </div>
      </Card>

      {/* Additional Stats */}
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-[color:var(--sinaxys-ink)]">Detalhamento</h2>
        <div className="grid gap-4 md:grid-cols-4">
          <DetailCard
            icon={Wrench}
            label="Em manutenção"
            value={stats?.total_in_maintenance || 0}
          />
          <DetailCard
            icon={Users}
            label="Adquiridos por colaboradores"
            value={stats?.total_acquired_by_user || 0}
          />
          <DetailCard
            icon={AlertTriangle}
            label="Extraviados"
            value={stats?.total_lost || 0}
          />
          <DetailCard
            icon={FileText}
            label="Documentação pendente"
            value={stats?.total_pending_documentation || 0}
          />
        </div>
      </Card>

      {/* Operational Alerts */}
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-[color:var(--sinaxys-ink)]">Alertas Operacionais</h2>
        
        {stats?.assets_pending_return > 0 && (
          <AlertItem
            severity="high"
            message={`${stats.assets_pending_return} ativos com devolução pendente`}
            description="Ativos com data de devolução expirada"
          />
        )}
        
        {stats?.assets_without_signed_document > 0 && (
          <AlertItem
            severity="medium"
            message={`${stats.assets_without_signed_document} ativos sem termo assinado`}
            description="Cessões sem documento anexado"
          />
        )}
        
        {stats?.assets_with_incidents_without_resolution > 0 && (
          <AlertItem
            severity="high"
            message={`${stats.assets_with_incidents_without_resolution} ocorrências em análise`}
            description="Incidentes sem conclusão"
          />
        )}
        
        {stats?.assets_idle_in_stock_over_30_days > 0 && (
          <AlertItem
            severity="low"
            message={`${stats.assets_idle_in_stock_over_30_days} ativos ociosos há mais de 30 dias`}
            description="Ativos sem movimentação"
          />
        )}

        {!stats?.assets_pending_return && 
         !stats?.assets_without_signed_document && 
         !stats?.assets_with_incidents_without_resolution &&
         !stats?.assets_idle_in_stock_over_30_days && (
          <div className="rounded-2xl bg-[color:var(--sinaxys-tint)]/20 p-4 text-sm text-muted-foreground">
            Nenhum alerta operacional no momento.
          </div>
        )}
      </Card>

      {/* Quick Actions */}
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <h2 className="mb-4 text-lg font-semibold text-[color:var(--sinaxys-ink)]">Ações Rápidas</h2>
        <div className="flex flex-wrap gap-3">
          <Button variant="outline" className="rounded-2xl" asChild>
            <Link to="/app/ativos">Ver todos os ativos</Link>
          </Button>
          <Button variant="outline" className="rounded-2xl" asChild>
            <Link to="/app/ativos?status=in_use">Ativos em uso</Link>
          </Button>
          <Button variant="outline" className="rounded-2xl" asChild>
            <Link to="/app/ativos?status=in_stock">Em estoque</Link>
          </Button>
          <Button variant="outline" className="rounded-2xl" asChild>
            <Link to="/app/ativos/ocorrencias">Ocorrências</Link>
          </Button>
        </div>
      </Card>
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

// =====================
// SUBCOMPONENTS
// =====================

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof Box;
  label: string;
  value: number;
  color: "blue" | "green" | "orange" | "red";
}) {
  const colorClasses = {
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    orange: "bg-orange-100 text-orange-600",
    red: "bg-red-100 text-red-600",
  };

  return (
    <Card className="rounded-2xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)]/15 p-4">
      <div className="flex items-start gap-3">
        <div className={`rounded-2xl p-2 ${colorClasses[color]}`}>
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="mt-1 text-2xl font-bold text-[color:var(--sinaxys-ink)]">
            {value.toLocaleString("pt-BR")}
          </div>
        </div>
      </div>
    </Card>
  );
}

function FinancialCard({
  icon: Icon,
  label,
  value,
  isPercentage = false,
}: {
  icon: typeof DollarSign;
  label: string;
  value: number;
  isPercentage?: boolean;
}) {
  const formatValue = isPercentage
    ? `${value.toFixed(1)}%`
    : value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  return (
    <div className="rounded-2xl bg-[color:var(--sinaxys-tint)]/15 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-white p-2 text-[color:var(--sinaxys-primary)] shadow-sm">
          <Icon className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {label}
          </div>
          <div className="mt-1 text-lg font-bold text-[color:var(--sinaxys-ink)]">
            {formatValue}
          </div>
        </div>
      </div>
    </div>
  );
}

function DetailCard({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Wrench;
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
      <div className="flex items-center gap-3">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <div className="flex-1">
          <div className="text-xs text-muted-foreground">{label}</div>
          <div className="mt-1 text-lg font-semibold text-[color:var(--sinaxys-ink)]">
            {value.toLocaleString("pt-BR")}
          </div>
        </div>
      </div>
    </div>
  );
}

function AlertItem({
  severity,
  message,
  description,
}: {
  severity: "high" | "medium" | "low";
  message: string;
  description: string;
}) {
  const severityClasses = {
    high: "bg-red-50 border-red-200 text-red-800",
    medium: "bg-orange-50 border-orange-200 text-orange-800",
    low: "bg-yellow-50 border-yellow-200 text-yellow-800",
  };

  const iconClasses = {
    high: "text-red-600",
    medium: "text-orange-600",
    low: "text-yellow-600",
  };

  return (
    <div className={`mb-3 rounded-2xl border ${severityClasses[severity]} p-4`}>
      <div className="flex items-start gap-3">
        <AlertTriangle className={`h-5 w-5 flex-shrink-0 ${iconClasses[severity]}`} />
        <div className="flex-1">
          <div className="font-semibold">{message}</div>
          <div className="mt-1 text-sm opacity-90">{description}</div>
        </div>
        <Badge variant="outline" className="flex-shrink-0">
          {severity === "high" ? "Alta" : severity === "medium" ? "Média" : "Baixa"}
        </Badge>
      </div>
    </div>
  );
}

function PercentBadge({ value }: { value: number }) {
  return (
    <div className="rounded-2xl bg-[color:var(--sinaxys-tint)]/15 p-4">
      <div className="flex items-start gap-3">
        <div className="rounded-2xl bg-white p-2 text-[color:var(--sinaxys-primary)] shadow-sm">
          <TrendingDown className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Depreciação
          </div>
          <div className="mt-1 text-lg font-bold text-[color:var(--sinaxys-ink)]">
            {value.toFixed(1)}%
          </div>
        </div>
      </div>
    </div>
  );
}
