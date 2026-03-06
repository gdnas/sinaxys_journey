import { useState } from "react";
import { Plus, Trash2, CheckCircle2, Target, TrendingUp } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";

import type { DbPerformanceIndicator, PiKind, PiConfidence } from "@/lib/okrDb";
import { piProgressPct } from "@/lib/okrDb";

interface PerformanceIndicatorEditorProps {
  objectiveId: string;
  indicators: DbPerformanceIndicator[];
  onCreate?: (indicator: Omit<DbPerformanceIndicator, "id" | "created_at" | "updated_at" | "achieved_at">) => Promise<void>;
  onUpdate?: (id: string, patch: Partial<DbPerformanceIndicator>) => Promise<void>;
  onDelete?: (id: string) => Promise<void>;
  onToggleAchieved?: (id: string, achieved: boolean) => Promise<void>;
  readOnly?: boolean;
  maxIndicators?: number;
}

type DraftPi = {
  title: string;
  kind: PiKind;
  metric_unit: string;
  start_value: string;
  target_value: string;
  current_value: string;
  due_at: string;
  confidence: PiConfidence;
};

export function PerformanceIndicatorEditor({
  objectiveId,
  indicators,
  onCreate,
  onUpdate,
  onDelete,
  onToggleAchieved,
  readOnly = false,
  maxIndicators = 5,
}: PerformanceIndicatorEditorProps) {
  const [showCreate, setShowCreate] = useState(false);
  const [draft, setDraft] = useState<DraftPi>({
    title: "",
    kind: "METRIC",
    metric_unit: "",
    start_value: "",
    target_value: "",
    current_value: "",
    due_at: "",
    confidence: "ON_TRACK",
  });
  const [creating, setCreating] = useState(false);

  const canAddMore = indicators.length < maxIndicators;

  const handleCreate = async () => {
    if (!draft.title.trim()) return;

    try {
      setCreating(true);
      await onCreate?.({
        objective_id: objectiveId,
        title: draft.title.trim(),
        kind: draft.kind,
        metric_unit: draft.metric_unit || null,
        start_value: draft.kind === "METRIC" ? parseFloat(draft.start_value) || null : null,
        target_value: draft.kind === "METRIC" ? parseFloat(draft.target_value) || null : null,
        current_value: draft.kind === "METRIC" ? parseFloat(draft.current_value) || null : null,
        due_at: draft.due_at || null,
        achieved: false,
        confidence: draft.confidence,
      });

      // Reset form
      setDraft({
        title: "",
        kind: "METRIC",
        metric_unit: "",
        start_value: "",
        target_value: "",
        current_value: "",
        due_at: "",
        confidence: "ON_TRACK",
      });
      setShowCreate(false);
    } catch (error) {
      console.error("Error creating PI:", error);
    } finally {
      setCreating(false);
    }
  };

  const confidenceColors = {
    ON_TRACK: "bg-emerald-100 text-emerald-700",
    AT_RISK: "bg-amber-100 text-amber-700",
    OFF_TRACK: "bg-red-100 text-red-700",
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
          <div>
            <h3 className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Indicadores de Performance</h3>
            <p className="text-xs text-muted-foreground">
              {indicators.length}/{maxIndicators} indicadores
            </p>
          </div>
        </div>

        {!readOnly && canAddMore && (
          <Button
            variant="outline"
            size="sm"
            className="h-8 rounded-xl bg-white"
            onClick={() => setShowCreate(!showCreate)}
          >
            <Plus className="mr-1 h-3.5 w-3.5" />
            Adicionar
          </Button>
        )}
      </div>

      {/* Create Form */}
      {showCreate && canAddMore && (
        <Card className="rounded-2xl border-[color:var(--sinaxys-border)] bg-white p-5">
          <div className="mb-4 flex items-center justify-between">
            <h4 className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Novo Indicador</h4>
            <Button
              variant="ghost"
              size="sm"
              className="h-8"
              onClick={() => setShowCreate(false)}
            >
              Cancelar
            </Button>
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Título</Label>
              <Input
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Ex.: Satisfação do cliente"
                className="h-11 rounded-xl"
              />
            </div>

            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select
                value={draft.kind}
                onValueChange={(v) => setDraft({ ...draft, kind: v as PiKind })}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="METRIC">Métrica</SelectItem>
                  <SelectItem value="DELIVERABLE">Entregável</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {draft.kind === "METRIC" && (
              <>
                <div className="grid gap-2">
                  <Label>Unidade</Label>
                  <Input
                    value={draft.metric_unit}
                    onChange={(e) => setDraft({ ...draft, metric_unit: e.target.value })}
                    placeholder="Ex.: %, R$, #"
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="grid gap-2">
                    <Label>Início</Label>
                    <Input
                      type="number"
                      value={draft.start_value}
                      onChange={(e) => setDraft({ ...draft, start_value: e.target.value })}
                      placeholder="0"
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Atual</Label>
                    <Input
                      type="number"
                      value={draft.current_value}
                      onChange={(e) => setDraft({ ...draft, current_value: e.target.value })}
                      placeholder="0"
                      className="h-11 rounded-xl"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label>Meta</Label>
                    <Input
                      type="number"
                      value={draft.target_value}
                      onChange={(e) => setDraft({ ...draft, target_value: e.target.value })}
                      placeholder="100"
                      className="h-11 rounded-xl"
                    />
                  </div>
                </div>
              </>
            )}

            <div className="grid gap-2">
              <Label>Confiança</Label>
              <Select
                value={draft.confidence}
                onValueChange={(v) => setDraft({ ...draft, confidence: v as PiConfidence })}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="ON_TRACK">No rumo</SelectItem>
                  <SelectItem value="AT_RISK">Em risco</SelectItem>
                  <SelectItem value="OFF_TRACK">Fora do rumo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button
              className="h-11 w-full rounded-2xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              onClick={handleCreate}
              disabled={!draft.title.trim() || creating}
            >
              {creating ? "Criando..." : "Criar Indicador"}
            </Button>
          </div>
        </Card>
      )}

      {/* Indicators List */}
      {indicators.length === 0 ? (
        <Card className="rounded-2xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-6 text-center">
          <Target className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
          <p className="text-sm text-muted-foreground">
            Nenhum indicador de performance definido
          </p>
        </Card>
      ) : (
        <div className="space-y-3">
          {indicators.map((indicator) => {
            const progress = piProgressPct(indicator);
            const isAchieved = indicator.achieved;

            return (
              <Card
                key={indicator.id}
                className={`overflow-hidden rounded-2xl border transition ${
                  isAchieved
                    ? "border-emerald-200 bg-emerald-50"
                    : "border-[color:var(--sinaxys-border)] bg-white"
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <h4 className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                          {indicator.title}
                        </h4>
                        <Badge
                          variant="outline"
                          className={`text-xs ${confidenceColors[indicator.confidence]}`}
                        >
                          {indicator.confidence === "ON_TRACK" && "No rumo"}
                          {indicator.confidence === "AT_RISK" && "Em risco"}
                          {indicator.confidence === "OFF_TRACK" && "Fora do rumo"}
                        </Badge>
                        {isAchieved && (
                          <Badge className="bg-emerald-100 text-emerald-700">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Concluído
                          </Badge>
                        )}
                      </div>

                      {indicator.kind === "METRIC" && (
                        <div className="space-y-2">
                          <div className="flex items-center gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Início:</span>{" "}
                              <span className="font-medium">{indicator.start_value}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Atual:</span>{" "}
                              <span className="font-medium">{indicator.current_value}</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Meta:</span>{" "}
                              <span className="font-medium">{indicator.target_value}</span>
                            </div>
                            {indicator.metric_unit && (
                              <span className="text-muted-foreground">{indicator.metric_unit}</span>
                            )}
                          </div>

                          {progress !== null && (
                            <div className="space-y-1">
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Progresso</span>
                                <span className="font-medium">{progress}%</span>
                              </div>
                              <Progress value={progress} className="h-2" />
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {!readOnly && (
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8"
                          onClick={() => onToggleAchieved?.(indicator.id, !isAchieved)}
                        >
                          {isAchieved ? (
                            <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                        {onDelete && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 text-red-600 hover:text-red-700"
                            onClick={() => onDelete(indicator.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {!canAddMore && (
        <div className="rounded-xl bg-amber-50 border border-amber-200 p-3 text-center text-sm text-amber-900">
          <TrendingUp className="mx-auto mb-1 h-4 w-4" />
          Limite máximo de {maxIndicators} indicadores atingido
        </div>
      )}
    </div>
  );
}