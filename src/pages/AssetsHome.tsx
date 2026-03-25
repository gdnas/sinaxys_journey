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

export function AssetsHome() {
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

  const canManage = user?.role === "MASTERADMIN" || user?.role === "ADMIN";

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
            icon={<PercentBadge />}
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
        <div className="flex flex flex-wrap gap-3">
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

// Default export for module (this is important one)
export default AssetsHomeWrapper;
}