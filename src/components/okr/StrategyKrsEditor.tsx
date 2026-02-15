import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Check,
  ChevronDown,
  ChevronRight,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import {
  createStrategyKeyResult,
  deleteStrategyKeyResult,
  listStrategyKeyResults,
  updateStrategyKeyResult,
  type DbStrategyKeyResult,
  type StrategyKrKind,
} from "@/lib/okrDb";
import type { DbProfilePublic } from "@/lib/profilePublicDb";

function asDateInputValue(v: string | null | undefined) {
  if (!v) return "";
  // already a date in DB (YYYY-MM-DD)
  return v;
}

function parseNum(v: string) {
  const t = v.trim().replace(",", ".");
  if (!t) return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function pctForMetric(kr: Pick<DbStrategyKeyResult, "start_value" | "target_value" | "current_value">) {
  if (typeof kr.start_value !== "number" || typeof kr.target_value !== "number" || typeof kr.current_value !== "number") return null;
  const denom = kr.target_value - kr.start_value;
  if (denom === 0) return null;
  const p = ((kr.current_value - kr.start_value) / denom) * 100;
  if (!Number.isFinite(p)) return null;
  return Math.max(0, Math.min(100, Math.round(p)));
}

function PersonSelect({
  people,
  value,
  onChange,
  disabled,
  placeholder = "Selecione…",
}: {
  people: DbProfilePublic[];
  value: string | null;
  onChange: (v: string | null) => void;
  disabled: boolean;
  placeholder?: string;
}) {
  const activePeople = useMemo(() => people.filter((p) => p.active).sort((a, b) => a.name.localeCompare(b.name)), [people]);

  return (
    <Select value={value ?? "__none__"} onValueChange={(v) => onChange(v === "__none__" ? null : v)} disabled={disabled}>
      <SelectTrigger className="h-11 rounded-2xl bg-white">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="rounded-2xl">
        <SelectItem value="__none__">Sem responsável</SelectItem>
        {activePeople.map((p) => (
          <SelectItem key={p.id} value={p.id}>
            {p.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function StrategyKrInlineEditor({
  kr,
  canEdit,
  people,
  onChanged,
}: {
  kr: DbStrategyKeyResult;
  canEdit: boolean;
  people: DbProfilePublic[];
  onChanged: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState(kr.title);
  const [kind, setKind] = useState<StrategyKrKind>(kr.kind);
  const [owner, setOwner] = useState<string | null>(kr.owner_user_id ?? null);
  const [metricUnit, setMetricUnit] = useState(kr.metric_unit ?? "");
  const [start, setStart] = useState(typeof kr.start_value === "number" ? String(kr.start_value) : "");
  const [target, setTarget] = useState(typeof kr.target_value === "number" ? String(kr.target_value) : "");
  const [current, setCurrent] = useState(typeof kr.current_value === "number" ? String(kr.current_value) : "");
  const [dueAt, setDueAt] = useState(asDateInputValue(kr.due_at));
  const [achieved, setAchieved] = useState(!!kr.achieved);
  const [confidence, setConfidence] = useState<DbStrategyKeyResult["confidence"]>(kr.confidence);

  useEffect(() => {
    setTitle(kr.title);
    setKind(kr.kind);
    setOwner(kr.owner_user_id ?? null);
    setMetricUnit(kr.metric_unit ?? "");
    setStart(typeof kr.start_value === "number" ? String(kr.start_value) : "");
    setTarget(typeof kr.target_value === "number" ? String(kr.target_value) : "");
    setCurrent(typeof kr.current_value === "number" ? String(kr.current_value) : "");
    setDueAt(asDateInputValue(kr.due_at));
    setAchieved(!!kr.achieved);
    setConfidence(kr.confidence);
    setSaving(false);
  }, [kr.id, kr.updated_at]);

  const pct = kind === "METRIC" ? pctForMetric({ start_value: parseNum(start), target_value: parseNum(target), current_value: parseNum(current) }) : null;

  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-4">
      <button
        type="button"
        className="flex w-full items-start justify-between gap-3 text-left"
        onClick={() => setOpen((v) => !v)}
      >
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{kr.title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
              {kr.kind === "METRIC" ? "Métrico" : "Entregável"}
            </Badge>
            {kr.kind === "METRIC" && pct !== null ? <span>{pct}%</span> : null}
            {kr.kind === "DELIVERABLE" && achieved ? (
              <span className="inline-flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> concluído
              </span>
            ) : null}
          </div>
        </div>
        <div className="grid h-9 w-9 place-items-center rounded-2xl border border-[color:var(--sinaxys-border)] bg-white text-muted-foreground">
          {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </div>
      </button>

      {open ? (
        <div className="mt-4 grid gap-4">
          <Separator />

          <div className="grid gap-2">
            <Label className="text-xs">Título</Label>
            <Input className="h-11 rounded-2xl" value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit || saving} />
          </div>

          <div className="grid gap-2 md:grid-cols-2">
            <div className="grid gap-2">
              <Label className="text-xs">Tipo</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as any)} disabled={!canEdit || saving}>
                <SelectTrigger className="h-11 rounded-2xl bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="METRIC">Métrico</SelectItem>
                  <SelectItem value="DELIVERABLE">Entregável</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label className="text-xs">Responsável</Label>
              <PersonSelect people={people} value={owner} onChange={setOwner} disabled={!canEdit || saving} />
            </div>
          </div>

          <div className="grid gap-2">
            <Label className="text-xs">Confiança</Label>
            <Select value={confidence} onValueChange={(v) => setConfidence(v as any)} disabled={!canEdit || saving}>
              <SelectTrigger className="h-11 rounded-2xl bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="ON_TRACK">No trilho</SelectItem>
                <SelectItem value="AT_RISK">Em risco</SelectItem>
                <SelectItem value="OFF_TRACK">Fora do trilho</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {kind === "METRIC" ? (
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label className="text-xs">Unidade</Label>
                <Input
                  className="h-11 rounded-2xl"
                  value={metricUnit}
                  onChange={(e) => setMetricUnit(e.target.value)}
                  disabled={!canEdit || saving}
                  placeholder="Ex.: %, R$, NPS"
                />
              </div>

              <div className="grid gap-3 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label className="text-xs">Início</Label>
                  <Input className="h-11 rounded-2xl" value={start} onChange={(e) => setStart(e.target.value)} disabled={!canEdit || saving} />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs">Atual</Label>
                  <Input className="h-11 rounded-2xl" value={current} onChange={(e) => setCurrent(e.target.value)} disabled={!canEdit || saving} />
                </div>
                <div className="grid gap-2">
                  <Label className="text-xs">Meta</Label>
                  <Input className="h-11 rounded-2xl" value={target} onChange={(e) => setTarget(e.target.value)} disabled={!canEdit || saving} />
                </div>
              </div>
            </div>
          ) : (
            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <Label className="text-xs">Data alvo</Label>
                <Input type="date" className="h-11 rounded-2xl" value={dueAt} onChange={(e) => setDueAt(e.target.value)} disabled={!canEdit || saving} />
              </div>
              <div className="grid gap-2">
                <Label className="text-xs">Concluído</Label>
                <Select value={achieved ? "YES" : "NO"} onValueChange={(v) => setAchieved(v === "YES")} disabled={!canEdit || saving}>
                  <SelectTrigger className="h-11 rounded-2xl bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="NO">Não</SelectItem>
                    <SelectItem value="YES">Sim</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}

          {canEdit ? (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button type="button" variant="outline" className="h-11 rounded-2xl bg-white" disabled={saving}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remover KR
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent className="rounded-3xl">
                  <AlertDialogHeader>
                    <AlertDialogTitle>Remover KR?</AlertDialogTitle>
                    <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="rounded-2xl">Cancelar</AlertDialogCancel>
                    <AlertDialogAction
                      className="rounded-2xl bg-destructive text-white hover:bg-destructive/90"
                      onClick={async () => {
                        try {
                          await deleteStrategyKeyResult(kr.id);
                          toast({ title: "KR removido" });
                          await onChanged();
                        } catch (e) {
                          toast({
                            title: "Não foi possível remover",
                            description: e instanceof Error ? e.message : "Erro inesperado.",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      Remover
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>

              <Button
                type="button"
                className="h-11 rounded-2xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                disabled={saving || title.trim().length < 4}
                onClick={async () => {
                  setSaving(true);
                  try {
                    await updateStrategyKeyResult(kr.id, {
                      title,
                      kind,
                      owner_user_id: owner,
                      metric_unit: kind === "METRIC" ? metricUnit.trim() || null : null,
                      start_value: kind === "METRIC" ? parseNum(start) : null,
                      current_value: kind === "METRIC" ? parseNum(current) : null,
                      target_value: kind === "METRIC" ? parseNum(target) : null,
                      due_at: kind === "DELIVERABLE" ? (dueAt.trim() || null) : null,
                      achieved: kind === "DELIVERABLE" ? achieved : false,
                      achieved_at: kind === "DELIVERABLE" && achieved ? new Date().toISOString() : null,
                      confidence,
                    });
                    toast({ title: "KR atualizado" });
                    await onChanged();
                  } catch (e) {
                    toast({
                      title: "Não foi possível salvar",
                      description: e instanceof Error ? e.message : "Erro inesperado.",
                      variant: "destructive",
                    });
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                <Save className="mr-2 h-4 w-4" />
                Salvar
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

export function StrategyKrsEditor({
  objectiveId,
  canEdit,
  people,
}: {
  objectiveId: string;
  canEdit: boolean;
  people: DbProfilePublic[];
}) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const qKrs = useQuery({
    queryKey: ["strategy-krs", objectiveId],
    queryFn: () => listStrategyKeyResults(objectiveId),
  });

  const [newOpen, setNewOpen] = useState(false);
  const [creating, setCreating] = useState(false);

  const [nTitle, setNTitle] = useState("");
  const [nKind, setNKind] = useState<StrategyKrKind>("METRIC");
  const [nOwner, setNOwner] = useState<string | null>(null);
  const [nUnit, setNUnit] = useState("");
  const [nStart, setNStart] = useState("");
  const [nTarget, setNTarget] = useState("");
  const [nCurrent, setNCurrent] = useState("");
  const [nDue, setNDue] = useState("");

  useEffect(() => {
    if (!newOpen) return;
    setCreating(false);
    setNTitle("");
    setNKind("METRIC");
    setNOwner(null);
    setNUnit("");
    setNStart("");
    setNTarget("");
    setNCurrent("");
    setNDue("");
  }, [newOpen]);

  const invalidate = async () => {
    await qc.invalidateQueries({ queryKey: ["strategy-krs", objectiveId] });
  };

  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">KRs do objetivo (longo prazo)</div>
          <div className="mt-1 text-sm text-muted-foreground">Defina evidências mensuráveis (métricas) ou entregáveis com data.</div>
        </div>
        {canEdit ? (
          <Button type="button" variant="outline" className="h-11 rounded-2xl bg-white" onClick={() => setNewOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Novo KR
          </Button>
        ) : null}
      </div>

      <Separator className="my-4" />

      {qKrs.isLoading ? (
        <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Carregando KRs…</div>
      ) : qKrs.error ? (
        <div className="rounded-2xl border border-destructive/30 bg-white p-4 text-sm text-destructive">Não foi possível carregar KRs.</div>
      ) : (qKrs.data ?? []).length ? (
        <div className="grid gap-3">
          {(qKrs.data ?? []).map((kr) => (
            <StrategyKrInlineEditor key={kr.id} kr={kr} canEdit={canEdit} people={people} onChanged={invalidate} />
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Nenhum KR ainda.</div>
      )}

      <AlertDialog open={newOpen} onOpenChange={setNewOpen}>
        <AlertDialogContent className="max-h-[88vh] overflow-auto rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Novo KR (longo prazo)</AlertDialogTitle>
            <AlertDialogDescription>Cadastre um KR com responsável e tipo.</AlertDialogDescription>
          </AlertDialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Título</Label>
              <Input className="h-11 rounded-2xl" value={nTitle} onChange={(e) => setNTitle(e.target.value)} disabled={creating} />
            </div>

            <div className="grid gap-3 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Tipo</Label>
                <Select value={nKind} onValueChange={(v) => setNKind(v as any)} disabled={creating}>
                  <SelectTrigger className="h-11 rounded-2xl bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value="METRIC">Métrico</SelectItem>
                    <SelectItem value="DELIVERABLE">Entregável</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Responsável</Label>
                <PersonSelect people={people} value={nOwner} onChange={setNOwner} disabled={creating} />
              </div>
            </div>

            {nKind === "METRIC" ? (
              <>
                <div className="grid gap-2">
                  <Label>Unidade</Label>
                  <Input
                    className="h-11 rounded-2xl"
                    value={nUnit}
                    onChange={(e) => setNUnit(e.target.value)}
                    disabled={creating}
                    placeholder="Ex.: %, R$, NPS"
                  />
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  <div className="grid gap-2">
                    <Label>Início</Label>
                    <Input className="h-11 rounded-2xl" value={nStart} onChange={(e) => setNStart(e.target.value)} disabled={creating} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Atual</Label>
                    <Input className="h-11 rounded-2xl" value={nCurrent} onChange={(e) => setNCurrent(e.target.value)} disabled={creating} />
                  </div>
                  <div className="grid gap-2">
                    <Label>Meta</Label>
                    <Input className="h-11 rounded-2xl" value={nTarget} onChange={(e) => setNTarget(e.target.value)} disabled={creating} />
                  </div>
                </div>
              </>
            ) : (
              <div className="grid gap-2">
                <Label>Data alvo</Label>
                <Input type="date" className="h-11 rounded-2xl" value={nDue} onChange={(e) => setNDue(e.target.value)} disabled={creating} />
              </div>
            )}
          </div>

          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-2xl" disabled={creating}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-2xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={creating || nTitle.trim().length < 4}
              onClick={async () => {
                setCreating(true);
                try {
                  await createStrategyKeyResult({
                    objective_id: objectiveId,
                    title: nTitle,
                    kind: nKind,
                    metric_unit: nKind === "METRIC" ? nUnit.trim() || null : null,
                    start_value: nKind === "METRIC" ? parseNum(nStart) : null,
                    current_value: nKind === "METRIC" ? parseNum(nCurrent) : null,
                    target_value: nKind === "METRIC" ? parseNum(nTarget) : null,
                    due_at: nKind === "DELIVERABLE" ? nDue.trim() || null : null,
                    achieved: false,
                    owner_user_id: nOwner,
                    confidence: "ON_TRACK",
                  });
                  toast({ title: "KR criado" });
                  await invalidate();
                  setNewOpen(false);
                } catch (e) {
                  toast({
                    title: "Não foi possível criar",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                } finally {
                  setCreating(false);
                }
              }}
            >
              Criar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}