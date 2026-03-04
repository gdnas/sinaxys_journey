import { PerformanceIndicatorEditor } from "@/components/okr/PerformanceIndicatorEditor";
import { TierBadge } from "@/components/okr/TierBadge";
import { DepartmentMultiSelect } from "@/components/okr/DepartmentMultiSelect";
import { UserMultiSelect } from "@/components/okr/UserMultiSelect";
import { useToast } from "@/hooks/use-toast";

interface ObjectiveDetailContentProps {
  objectiveId: string;
  tier?: "TIER1" | "TIER2";
  disabled?: boolean;
}

export function ObjectiveDetailContent({ objectiveId, tier, disabled = false }: ObjectiveDetailContentProps) {
  const { toast } = useToast();
  const { data: objective } = useQuery({
    queryKey: ["okr-objective", objectiveId],
    queryFn: async () => {
      // Você precisará importar `getOkrObjective` se ainda não estiver importado em `okrDb.ts`
      // Por ora, estamos usando dados fictícios para demonstração
      return null;
    },
    enabled: !!objectiveId,
  });

  const isTier1 = tier === "TIER1";

  return (
    <div className="space-y-6">
      {/* Tier Badge */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-medium text-muted-foreground">Tier</span>
        <TierBadge tier={tier || (objective?.level === "COMPANY" ? "TIER1" : "TIER2")} size="md" />
      </div>

      {/* Performance Indicators */}
      <PerformanceIndicatorEditor
        objectiveId={objectiveId}
        indicators={[]} // TODO: carregar PIs existentes
        onCreate={async (data) => {
          toast({
            title: "Indicador criado",
            description: "O indicador de performance foi criado com sucesso.",
          });
        }}
        onUpdate={async (id, patch) => {
          toast({
            title: "Indicador atualizado",
            description: "O indicador foi atualizado com sucesso.",
          });
        }}
        onDelete={async (id) => {
          toast({
            title: "Indicador excluído",
            description: "O indicador foi excluído.",
          });
        }}
        readOnly={disabled}
      />

      {/* Múltiplos Departamentos (Tier 2) */}
      {!isTier1 && (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-muted-foreground">Departamentos</span>
          </div>
          <DepartmentMultiSelect
            departments={[]} // TODO: carregar departamentos disponíveis
            value={[]} // TODO: carregar departamentos selecionados
            onChange={() => {
              // TODO: sincronizar departamentos
            }}
            disabled={disabled}
          />
        </div>
      )}

      {/* Múltiplos Responsáveis */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-muted-foreground">Responsáveis</span>
        </div>
        <UserMultiSelect
          users={[]} // TODO: carregar usuários disponíveis
          value={[]} // TODO: carregar responsáveis selecionados
          onChange={() => {
            // TODO: sincronizar responsáveis
          }}
          disabled={disabled}
        />
      </div>

      {/* Botão Salvar */}
      {!disabled && (
        <Button
          onClick={() => {
            toast({
              title: "Alterações salvas",
              description: "As alterações no objetivo foram salvas com sucesso.",
            });
          }}
          className="w-full"
        >
          Salvar Alterações
        </Button>
      )}
    </div>
  );
}
