import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Save, X } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import {
  createKrChangeLog,
  listKrChangeLogs,
  updateKeyResult,
  type DbKrChangeLog,
  type DbOkrKeyResult,
} from "@/lib/okrDb";
import { listProfilesByCompany } from "@/lib/profilesDb";

function toNumberOrNull(v: string) {
  const raw = v.trim().replace(",", ".");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function formatWhen(ts: string) {
  try {
    return new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  } catch {
    return ts;
  }
}

function changesSummary(changes: any) {
  const entries = Object.entries(changes ?? {}).filter(([, v]) => v && typeof v === "object" && "from" in v && "to" in v);
  if (!entries.length) return "—";
  return entries.map(([k]) => k).join(", ");
}

function FieldChange({ label, from, to }: { label: string; from: any; to: any }) {
  const safe = (v: any) => (v === null || v === undefined || v === "" ? "—" : String(v));
  return (
    <div className="grid gap-1">
      <div className="text-xs font-semibold text-[color:var(--sinaxys-ink)]">{label}</div>
      <div className="text-xs text-muted-foreground">
        <span className="line-through">{safe(from)}</span> <span className="mx-1">→</span> <span className="font-medium text-[color:var(--sinaxys-ink)]">{safe(to)}</span>
      </div>
    </div>
  );
}

export function KrEditDialog(props: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  companyId: string;
  userId: string;
  kr: DbOkrKeyResult;
}) {
  const { open, onOpenChange, companyId, userId, kr } = props;
  const { toast } = useToast();
  const qc = useQueryClient();

  const [title, setTitle] = useState(kr.title);
  const [unit, setUnit] = useState(kr.metric_unit ?? "");
  const [startValue, setStartValue] = useState(kr.start_value === null ? "" : String(kr.start_value));
  const [currentValue, setCurrentValue] = useState(kr.current_value === null ? "" : String(kr.current_value));
  const [targetValue, setTargetValue] = useState(kr.target_value === null ? "" : String(kr.target_value));
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (!open) return;
    setTitle(kr.title);
    setUnit(kr.metric_unit ?? "");
    setStartValue(kr.start_value === null ? "" : String(kr.start_value));
    setCurrentValue(kr.current_value === null ? "" : String(kr.current_value));
    setTargetValue(kr.target_value === null ? "" : String(kr.target_value));
  }, [open, kr]);

  const { data: logs = [] } = useQuery({
    queryKey: ["okr-kr-change-logs", kr.id],
    enabled: open,
    queryFn: () => listKrChangeLogs(kr.id),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles", companyId],
    enabled: open,
    queryFn: () => listProfilesByCompany(companyId),
  });

  const nameById = useMemo(() => new Map(profiles.map((p) => [p.id, p.name ?? p.email] as const)), [profiles]);

  async function save() {
    if (saving) return;
    setSaving(true);
    try {
      const nextStart = toNumberOrNull(startValue);
      const nextCurrent = toNumberOrNull(currentValue);
      const nextTarget = toNumberOrNull(targetValue);
      const nextUnit = unit.trim() || null;

      const patch: Partial<Pick<DbOkrKeyResult, "title" | "metric_unit" | "start_value" | "current_value" | "target_value">> = {};
      const diff: Record<string, { from: any; to: any }> = {};

      const pushDiff = (field: keyof DbOkrKeyResult, from: any, to: any) => {
        const same = (from ?? null) === (to ?? null);
        if (same) return;
        diff[String(field)] = { from: from ?? null, to: to ?? null };
        (patch as any)[field] = to;
      };

      pushDiff("title", kr.title, title.trim());
      pushDiff("metric_unit", kr.metric_unit, nextUnit);
      pushDiff("start_value", kr.start_value, nextStart);
      pushDiff("current_value", kr.current_value, nextCurrent);
      pushDiff("target_value", kr.target_value, nextTarget);

      if (!Object.keys(patch).length) {
        onOpenChange(false);
        return;
      }

      await updateKeyResult(kr.id, patch);
      await createKrChangeLog({
        company_id: companyId,
        key_result_id: kr.id,
        user_id: userId,
        changes: diff,
      });

      await qc.invalidateQueries({ queryKey: ["okr-krs", kr.objective_id] });
      await qc.invalidateQueries({ queryKey: ["okr-kr-change-logs", kr.id] });
      await qc.invalidateQueries({ queryKey: ["okr-kr-stats", companyId] });

      toast({ title: "KR atualizado", description: `Alterações: ${Object.keys(diff).join(", ")}.` });
      onOpenChange(false);
    } catch (e) {
      toast({
        title: "Não foi possível salvar",
        description: e instanceof Error ? e.message : "Erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/40 backdrop-blur-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          className={cn(
            "fixed left-[50%] top-[50%] z-50 w-[92vw] max-w-2xl translate-x-[-50%] translate-y-[-50%] overflow-hidden rounded-3xl border border-[color:var(--sinaxys-border)] bg-white shadow-xl",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95",
          )}
        >
          <div className="flex items-start justify-between gap-4 p-5">
            <div className="min-w-0">
              <DialogPrimitive.Title className="text-base font-semibold text-[color:var(--sinaxys-ink)]">Editar Key Result</DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-sm text-muted-foreground">
                Atualize <span className="font-medium text-[color:var(--sinaxys-ink)]">resultado</span>, <span className="font-medium text-[color:var(--sinaxys-ink)]">origem</span> e <span className="font-medium text-[color:var(--sinaxys-ink)]">alvo</span> e mantenha o histórico.
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <Button variant="outline" size="icon" className="h-10 w-10 rounded-xl bg-white" aria-label="Fechar">
                <X className="h-4 w-4" />
              </Button>
            </DialogPrimitive.Close>
          </div>

          <Separator />

          <div className="grid gap-6 p-5 md:grid-cols-2">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Título</Label>
                <Input className="h-11 rounded-xl" value={title} onChange={(e) => setTitle(e.target.value)} />
              </div>

              <div className="grid gap-2">
                <Label>Unidade (opcional)</Label>
                <Input className="h-11 rounded-xl" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="%, R$, pts…" />
              </div>

              <div className="grid gap-2 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label>Origem</Label>
                  <Input className="h-11 rounded-xl" value={startValue} onChange={(e) => setStartValue(e.target.value)} placeholder="0" />
                </div>
                <div className="grid gap-2">
                  <Label>Resultado</Label>
                  <Input className="h-11 rounded-xl" value={currentValue} onChange={(e) => setCurrentValue(e.target.value)} placeholder="10" />
                </div>
                <div className="grid gap-2">
                  <Label>Alvo</Label>
                  <Input className="h-11 rounded-xl" value={targetValue} onChange={(e) => setTargetValue(e.target.value)} placeholder="100" />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-1">
                <Button variant="outline" className="h-11 rounded-xl bg-white" onClick={() => onOpenChange(false)} disabled={saving}>
                  Cancelar
                </Button>
                <Button className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90" onClick={save} disabled={saving || title.trim().length < 6}>
                  <Save className="mr-2 h-4 w-4" />
                  Salvar
                </Button>
              </div>
            </div>

            <div className="grid gap-3">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Histórico de alterações</div>
                <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">{logs.length}</Badge>
              </div>

              <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/60">
                <ScrollArea className="h-[280px] p-3">
                  {logs.length ? (
                    <div className="grid gap-3">
                      {logs.map((l: DbKrChangeLog) => {
                        const who = nameById.get(l.user_id) ?? "Usuário";
                        const changes = l.changes ?? {};
                        return (
                          <div key={l.id} className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-3">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{who}</div>
                              <div className="text-xs text-muted-foreground">{formatWhen(l.created_at)}</div>
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">Campos: {changesSummary(changes)}</div>

                            <div className="mt-3 grid gap-2">
                              {Object.entries(changes).map(([field, v]: any) => {
                                if (!v || typeof v !== "object" || !("from" in v) || !("to" in v)) return null;
                                const labelMap: Record<string, string> = {
                                  title: "Título",
                                  metric_unit: "Unidade",
                                  start_value: "Origem",
                                  current_value: "Resultado",
                                  target_value: "Alvo",
                                };
                                return <FieldChange key={field} label={labelMap[field] ?? field} from={v.from} to={v.to} />;
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="p-3 text-sm text-muted-foreground">Ainda não há alterações registradas.</div>
                  )}
                </ScrollArea>
              </div>
            </div>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
