import { useState } from "react";
import { Plus, Trash2, Target } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import type {
  DbPerformanceIndicator,
  PiKind,
  PiConfidence,
  piProgressPct
} from "@/lib/okrDb";

type PerformanceIndicatorEditorProps = {
  objectiveId: string;
  indicators: DbPerformanceIndicator[];
  onCreate: (data: Omit<DbPerformanceIndicator, "id" | "created_at" | "updated_at" | "achieved_at">) => Promise<void>;
  onUpdate: (id: string, patch: Partial<Omit<DbPerformanceIndicator, "id" | "created_at" | "updated_at" | "achieved_at">>) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onToggleAchieved: (id: string, achieved: boolean) => Promise<void>;
  readOnly?: boolean;
};

export function PerformanceIndicatorEditor({
  objectiveId,
  indicators,
  onCreate,
  onUpdate,
  onDelete,
  onToggleAchieved,
  readOnly = false,
}: PerformanceIndicatorEditorProps) {
  const { toast } = useToast();
  
  const [newIndicator, setNewIndicator] = useState<Partial<DbPerformanceIndicator>>({
    kind: "METRIC",
    title: "",
    description: "",
    target_value: 100,
    current_value: 0,
    unit: "%",
    achieved: false,
    confidence: "ON_TRACK",
  });

  const handleCreate = async () => {
    if (!newIndicator.title.trim()) return;

    const payload: Omit<DbPerformanceIndicator, "id" | "created_at" | "updated_at" | "achieved_at"> = {
      objective_id: objectiveId,
      title: newIndicator.title.trim(),
      kind: newIndicator.kind,
      metric_unit: newIndicator.metric_unit || null,
      start_value: newIndicator.start_value || null,
      target_value: newIndicator.target_value || null,
      due_at: newIndicator.due_at || null,
      achieved: false,
      achieved_at: null,
      confidence: "ON_TRACK",
    };

    await onCreate(payload);
    setNewIndicator({
      title: "",
      kind: "METRIC",
      metric_unit: "",
      start_value: 0,
      target_value: 0,
      due_at: "",
    });
  };

  const handleUpdate = async (id: string, field: string, value: any) => {
    const patch: Partial<DbPerformanceIndicator> = {
      [field]: value,
    };
    await onUpdate(id, patch);
  };

  const getProgress = (indicator: DbPerformanceIndicator): number | null => {
    if (indicator.kind === "DELIVERABLE") {
      return indicator.achieved ? 100 : 0;
    }
    const { start_value, target_value, current_value } = indicator;
    if (typeof start_value !== "number" || typeof target_value !== "number" || typeof current_value !== "number") {
      return null;
    }
    if (start_value === target_value) return 100;
    const pct = ((current_value - start_value) / (target_value - start_value)) * 100;
    return Math.max(0, Math.min(100, Math.round(pct)));
  };

  const getConfidenceColor = (confidence: PiConfidence) => {
    switch (confidence) {
      case "ON_TRACK":
        return "bg-green-100 text-green-700 dark:bg-green-900 dark:text-green-100";
      case "AT_RISK":
        return "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-100";
      case "OFF_TRACK":
        return "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-100";
      default:
        return "bg-gray-100 text-gray-700";
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-primary" />
          <h3 className="text-lg font-semibold">Indicadores de Performance</h3>
        </div>
        <Button
          size="sm"
          onClick={handleCreate}
          disabled={readOnly || !newIndicator.title.trim()}
        >
          <Plus className="h-4 w-4 mr-1" />
          Novo PI
        </Button>
      </div>

      {/* Formulário rápido para novo PI */}
      <div className="grid grid-cols-1 md:grid-cols-6 gap-3 p-4 border rounded-lg bg-muted/30">
        <div className="md:col-span-2">
          <Label htmlFor="new-pi-title" className="text-sm mb-1">Título</Label>
          <Input
            id="new-pi-title"
            placeholder="Ex: Aumentar conversão"
            value={newIndicator.title}
            onChange={(e) => setNewIndicator({ ...newIndicator, title: e.target.value })}
            disabled={readOnly}
          />
        </div>

        <div>
          <Label htmlFor="new-pi-kind" className="text-sm mb-1">Tipo</Label>
          <Select
            value={newIndicator.kind}
            onValueChange={(value) => setNewIndicator({ ...newIndicator, kind: value as PiKind })}
            disabled={readOnly}
          >
            <SelectTrigger id="new-pi-kind">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="METRIC">Métrica</SelectItem>
              <SelectItem value="DELIVERABLE">Entregável</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div>
          <Label htmlFor="new-pi-unit" className="text-sm mb-1">Unidade</Label>
          <Input
            id="new-pi-unit"
            placeholder="Ex: %"
            value={newIndicator.metric_unit}
            onChange={(e) => setNewIndicator({ ...newIndicator, metric_unit: e.target.value })}
            disabled={readOnly || newIndicator.kind === "DELIVERABLE"}
          />
        </div>

        <div>
          <Label htmlFor="new-pi-start" className="text-sm mb-1">Início</Label>
          <Input
            id="new-pi-start"
            type="number"
            placeholder="0"
            value={newIndicator.start_value}
            onChange={(e) => setNewIndicator({ ...newIndicator, start_value: Number(e.target.value) })}
            disabled={readOnly || newIndicator.kind === "DELIVERABLE"}
          />
        </div>

        <div>
          <Label htmlFor="new-pi-target" className="text-sm mb-1">Meta</Label>
          <Input
            id="new-pi-target"
            type="number"
            placeholder="100"
            value={newIndicator.target_value}
            onChange={(e) => setNewIndicator({ ...newIndicator, target_value: Number(e.target.value) })}
            disabled={readOnly}
          />
        </div>
      </div>

      {/* Lista de PIs existentes */}
      <div className="space-y-2">
        {indicators.map((indicator) => (
          <div
            key={indicator.id}
            className="flex items-start gap-3 p-4 border rounded-lg hover:bg-accent/50 transition-colors"
          >
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{indicator.title}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getConfidenceColor(indicator.confidence)}`}>
                    {indicator.confidence === "ON_TRACK" ? "No rumo" : indicator.confidence === "AT_RISK" ? "Em risco" : "Fora do rumo"}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  {indicator.achieved && (
                    <span className="text-green-600 dark:text-green-400 font-medium text-sm">✓ Concluído</span>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(indicator.id)}
                    disabled={readOnly}
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
              <div className="flex items-center gap-4 text-sm">
                <span className="text-muted-foreground">
                  {indicator.kind === "METRIC" ? `${indicator.current_value ?? 0} / ${indicator.target_value}` : indicator.metric_unit}
                </span>

                {indicator.kind === "METRIC" && (
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">{indicator.metric_unit}</span>
                    <span className="font-semibold">{getProgress(indicator)}%</span>
                  </div>
                )}
              </div>

              {/* Controles rápidos */}
              <div className="flex items-center gap-2 pt-2 border-t">
                {!indicator.achieved && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => onToggleAchieved(indicator.id, true)}
                    disabled={readOnly}
                  >
                    Marcar como atingido
                  </Button>
                )}

                <Select
                  value={indicator.confidence}
                  onValueChange={(value) => handleUpdate(indicator.id, "confidence", value)}
                  disabled={readOnly || indicator.achieved}
                >
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ON_TRACK">No rumo</SelectItem>
                    <SelectItem value="AT_RISK">Em risco</SelectItem>
                    <SelectItem value="OFF_TRACK">Fora do rumo</SelectItem>
                  </SelectContent>
                </Select>

                {indicator.kind === "METRIC" && !indicator.achieved && (
                  <Input
                    type="number"
                    placeholder="Atual"
                    value={indicator.current_value ?? ""}
                    onChange={(e) => handleUpdate(indicator.id, "current_value", Number(e.target.value))}
                    disabled={readOnly}
                    className="w-32"
                  />
                )}
              </div>
            </div>
          </div>
        ))}

        {indicators.length === 0 && (
          <div className="text-center py-8 text-muted-foreground border rounded-lg border-dashed">
            <Target className="h-12 w-12 mx-auto mb-2 text-muted-foreground opacity-50" />
            <p className="text-muted-foreground">Nenhum indicador de performance criado ainda</p>
            <p className="text-sm text-muted-foreground mt-1">Adicione PIs para acompanhar o progresso deste objetivo</p>
          </div>
        )}
      </div>
    </div>
  );
}