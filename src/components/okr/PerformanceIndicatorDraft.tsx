import { useState } from "react";
import { Plus, Trash2, Target } from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import type { PiKind, PiConfidence } from "@/lib/okrDb";

export type DraftPerformanceIndicator = {
  title: string;
  kind: PiKind;
  metric_unit: string;
  start_value: string;
  target_value: string;
  current_value: string;
  due_at: string;
  confidence: PiConfidence;
};

interface PerformanceIndicatorDraftProps {
  indicators: DraftPerformanceIndicator[];
  onChange: (indicators: DraftPerformanceIndicator[]) => void;
  maxIndicators?: number;
}

export function PerformanceIndicatorDraft({
  indicators,
  onChange,
  maxIndicators = 5,
}: PerformanceIndicatorDraftProps) {
  const addIndicator = () => {
    if (indicators.length >= maxIndicators) return;
    onChange([
      ...indicators,
      {
        title: "",
        kind: "METRIC",
        metric_unit: "",
        start_value: "",
        target_value: "",
        current_value: "",
        due_at: "",
        confidence: "ON_TRACK",
      },
    ]);
  };

  const removeIndicator = (index: number) => {
    onChange(indicators.filter((_, i) => i !== index));
  };

  const updateIndicator = (index: number, field: keyof DraftPerformanceIndicator, value: any) => {
    onChange(
      indicators.map((ind, i) =>
        i === index ? { ...ind, [field]: value } : ind
      )
    );
  };

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-2">
        <Label>Indicadores de Performance (0 a {maxIndicators})</Label>
        <Button
          variant="outline"
          className="h-9 rounded-xl bg-white"
          disabled={indicators.length >= maxIndicators}
          onClick={addIndicator}
        >
          <Plus className="mr-2 h-4 w-4" />
          Adicionar
        </Button>
      </div>

      {indicators.length === 0 ? (
        <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">
          Nenhum indicador de performance. Indicadores são métricas de acompanhamento contínuo (ex.: NPS, churn, tempo de resposta).
        </div>
      ) : (
        <div className="grid gap-3">
          {indicators.map((ind, idx) => (
            <Card key={idx} className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 grid gap-3">
                  <div className="grid gap-2">
                    <Label className="text-xs">Título</Label>
                    <Input
                      className="h-10 rounded-xl"
                      value={ind.title}
                      onChange={(e) => updateIndicator(idx, "title", e.target.value)}
                      placeholder="Ex.: NPS de clientes"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label className="text-xs">Tipo</Label>
                      <Select
                        value={ind.kind}
                        onValueChange={(v) => updateIndicator(idx, "kind", v as PiKind)}
                      >
                        <SelectTrigger className="h-10 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          <SelectItem value="METRIC">Métrica</SelectItem>
                          <SelectItem value="DELIVERABLE">Entregável</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    {ind.kind === "METRIC" && (
                      <>
                        <div className="grid gap-2">
                          <Label className="text-xs">Unidade</Label>
                          <Input
                            className="h-10 rounded-xl"
                            value={ind.metric_unit}
                            onChange={(e) => updateIndicator(idx, "metric_unit", e.target.value)}
                            placeholder="% / # / R$"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-xs">Início</Label>
                          <Input
                            className="h-10 rounded-xl"
                            value={ind.start_value}
                            onChange={(e) => updateIndicator(idx, "start_value", e.target.value)}
                            placeholder="0"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-xs">Meta</Label>
                          <Input
                            className="h-10 rounded-xl"
                            value={ind.target_value}
                            onChange={(e) => updateIndicator(idx, "target_value", e.target.value)}
                            placeholder="100"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label className="text-xs">Atual</Label>
                          <Input
                            className="h-10 rounded-xl"
                            value={ind.current_value}
                            onChange={(e) => updateIndicator(idx, "current_value", e.target.value)}
                            placeholder="50"
                          />
                        </div>
                      </>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-2">
                      <Label className="text-xs">Prazo (YYYY-MM-DD)</Label>
                      <Input
                        className="h-10 rounded-xl"
                        value={ind.due_at}
                        onChange={(e) => updateIndicator(idx, "due_at", e.target.value)}
                        placeholder="2026-03-31"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label className="text-xs">Confiança</Label>
                      <Select
                        value={ind.confidence}
                        onValueChange={(v) => updateIndicator(idx, "confidence", v as PiConfidence)}
                      >
                        <SelectTrigger className="h-10 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                          <SelectItem value="ON_TRACK">No trilho</SelectItem>
                          <SelectItem value="AT_RISK">Em risco</SelectItem>
                          <SelectItem value="OFF_TRACK">Fora do trilho</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>

                <Button
                  variant="ghost"
                  className="h-9 rounded-xl text-muted-foreground hover:bg-[color:var(--sinaxys-bg)]"
                  onClick={() => removeIndicator(idx)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}