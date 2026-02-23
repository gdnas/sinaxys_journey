import { MapPinned, MonitorSmartphone } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { OkrPageHeader } from "@/components/OkrPageHeader";
import { OkrSubnav } from "@/components/OkrSubnav";
import { OkrMapExplorer } from "@/components/okr/OkrMapExplorer";
import { useIsMobile } from "@/hooks/use-mobile";
import { Link } from "react-router-dom";

export default function OkrMap() {
  const { user } = useAuth();
  const { companyId } = useCompany();
  const isMobile = useIsMobile();

  if (!user) return null;

  if (!companyId) {
    return (
      <div className="grid gap-6">
        <OkrPageHeader
          title="Mapa Estratégico-Tático-Operacional"
          subtitle="Carregando contexto da empresa…"
          icon={<MapPinned className="h-5 w-5" />}
        />

        <OkrSubnav />

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-sm text-muted-foreground">Aguardando identificação da empresa do seu usuário…</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <OkrPageHeader
        title="Mapa Estratégico-Tático-Operacional"
        icon={<MapPinned className="h-5 w-5" />}
      />

      <OkrSubnav />

      {isMobile ? (
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Mapa disponível apenas no desktop/tablet</div>
              <div className="mt-1 text-sm text-muted-foreground">
                No celular, use as telas de <span className="font-medium text-[color:var(--sinaxys-ink)]">Hoje</span>, <span className="font-medium text-[color:var(--sinaxys-ink)]">Ano</span> e <span className="font-medium text-[color:var(--sinaxys-ink)]">Trimestre</span>.
              </div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
              <MonitorSmartphone className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            <Button asChild variant="outline" className="h-11 rounded-2xl bg-white">
              <Link to="/okr/hoje">Abrir OKRs de hoje</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-2xl bg-white">
              <Link to="/okr/year">Abrir objetivos do ano</Link>
            </Button>
            <Button asChild variant="outline" className="h-11 rounded-2xl bg-white">
              <Link to="/okr/quarter">Abrir objetivos do trimestre</Link>
            </Button>
          </div>
        </Card>
      ) : (
        <OkrMapExplorer companyId={companyId} />
      )}
    </div>
  );
}