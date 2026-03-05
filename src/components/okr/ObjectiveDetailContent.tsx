import { PerformanceIndicatorEditor } from "@/components/okr/PerformanceIndicatorEditor";
import { TierBadge } from "@/components/okr/TierBadge";
import { useToast } from "@/hooks/use-toast";

interface ObjectiveDetailContentProps {
  objectiveId: string;
  tier?: "TIER1" | "TIER2";
}

export function ObjectiveDetailContent({ objectiveId, tier = "TIER1" }: ObjectiveDetailContentProps) {
  const { toast } = useToast();

  return (
    <div className="space-y-6">
      {/* Performance Indicators */}
      <div className="grid gap-3">
        <h2 className="text-lg font-semibold">Indicadores de Performance</h2>
        <p className="text-sm text-muted-foreground">
          Acompanhe o progresso deste objetivo através de PIs métricos ou entregáveis.
        </p>
        <PerformanceIndicatorEditor
          objectiveId={objectiveId}
          indicators={[]}
          onCreate={async (data) => {
            toast({ title: "PI criado" });
            // TODO: Implementar criação de PI
          }}
          onUpdate={async (id, patch) => {
            toast({ title: "PI atualizado" });
            // TODO: Implementar atualização de PI
          }}
          onDelete={async (id) => {
            toast({ title: "PI excluído" });
            // TODO: Implementar exclusão de PI
          }}
          onToggleAchieved={async (id, achieved) => {
            toast({ title: "PI atingido" });
            // TODO: Implementar marcação como atingido
          }}
          readOnly={false}
        />
      </div>
    </div>
  );
}