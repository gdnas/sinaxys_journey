import { MapPinned } from "lucide-react";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { OkrPageHeader } from "@/components/OkrPageHeader";
import { OkrSubnav } from "@/components/OkrSubnav";
import { OkrMapExplorer } from "@/components/okr/OkrMapExplorer";

export default function OkrMap() {
  const { user } = useAuth();
  const { companyId } = useCompany();

  if (!user) return null;

  if (!companyId) {
    return (
      <div className="grid gap-6">
        <OkrPageHeader
          title="Mapa estratégico"
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
        title="Mapa estratégico"
        subtitle="Uma visão conectada da estratégia até a execução — com edição rápida e leitura do andamento."
        icon={<MapPinned className="h-5 w-5" />}
      />

      <OkrSubnav />

      <OkrMapExplorer companyId={companyId} />
    </div>
  );
}