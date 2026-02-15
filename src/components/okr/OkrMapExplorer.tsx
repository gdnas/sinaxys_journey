import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  ChevronDown,
  ChevronRight,
  CircleDot,
  Edit3,
  Layers,
  ListTree,
  Save,
  Target,
  X,
  Flag,
  Route,
  CalendarClock,
  Network,
  Link2,
  UserRound,
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { OrgChartTreeCanvas, type OrgNode } from "@/components/OrgChartTreeCanvas";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import {
  getCompanyFundamentals,
  getOkrObjective,
  listOkrCycles,
  listOkrObjectives,
  listStrategyObjectives,
  listKeyResults,
  krProgressPct,
  updateKeyResult,
  updateOkrObjective,
  upsertCompanyFundamentals,
  updateStrategyObjective,
  type DbCompanyFundamentals,
  type DbOkrCycle,
  type DbOkrKeyResult,
  type DbOkrObjective,
  type DbStrategyObjective,
} from "@/lib/okrDb";
import { listPublicProfilesByCompany, type DbProfilePublic } from "@/lib/profilePublicDb";
import { objectiveLevelLabel, objectiveTypeBadgeClass, objectiveTypeLabel } from "@/lib/okrUi";
import { cn } from "@/lib/utils";
import {
  describedItemsToLines,
  parseDescribedItems,
  serializeDescribedItems,
  type DescribedItem,
} from "@/lib/fundamentalsFormat";
import { DescribedItemsEditor } from "@/components/fundamentals/DescribedItemsEditor";

type NodeId = string;

type Node =
  | { kind: "root"; id: "root" }
  | { kind: "fundamentals"; id: "fundamentals" }
  | { kind: "fundamental"; id: `fund:${keyof DbCompanyFundamentals}`; field: keyof DbCompanyFundamentals }
  | { kind: "strategy"; id: "strategy" }
  | { kind: "strategyObjective"; id: `so:${string}`; soId: string }
  | { kind: "cycles"; id: "cycles" }
  | { kind: "cycle"; id: `c:${string}`; cycleId: string }
  | { kind: "objective"; id: `o:${string}`; objectiveId: string }
  | { kind: "kr"; id: `kr:${string}`; krId: string };

function parseListValue(v: string | null | undefined) {
  if (!v?.trim()) return [];
  return v
    .split("\n")
    .map((s) => s.trim())
    .map((s) => s.replace(/^[-•]\s+/, ""))
    .filter(Boolean);
}

function serializeListValue(items: string[]) {
  return items
    .map((s) => s.trim())
    .filter(Boolean)
    .join("\n");
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}

function hueFromId(id: string) {
  // Deterministic hue (0..359)
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 360;
  return h;
}

function nodeTitle(n: Node) {
  if (n.kind === "root") return "Mapa";
  if (n.kind === "fundamentals") return "Fundamentos";
  if (n.kind === "fundamental") {
    const map: Record<keyof DbCompanyFundamentals, string> = {
      company_id: "Empresa",
      mission: "Missão",
      vision: "Visão",
      purpose: "Propósito",
      values: "Valores",
      culture: "Cultura",
      strategic_north: "(removido)",
      created_at: "Criado em",
      updated_at: "Atualizado em",
    };
    return map[n.field] ?? String(n.field);
  }
  if (n.kind === "strategy") return "Objetivos de longo prazo";
  if (n.kind === "cycles") return "OKRs (ciclos)";
  if (n.kind === "cycle") return "Ciclo";
  if (n.kind === "objective") return "Objetivo";
  if (n.kind === "kr") return "KR";
  if (n.kind === "strategyObjective") return "Objetivo longo prazo";
  return "";
}

function cycleLabel(c: DbOkrCycle) {
  const base = c.type === "ANNUAL" ? `${c.year}` : `Q${c.quarter ?? "?"} / ${c.year}`;
  return c.name?.trim() ? `${c.name} · ${base}` : base;
}

function rowIndentStyle(depth: number) {
  return { paddingLeft: depth <= 0 ? 0 : Math.min(32, depth * 12) } as const;
}

function Row({
  depth,
  active,
  expanded,
  canExpand,
  icon,
  title,
  subtitle,
  right,
  onToggle,
  onClick,
}: {
  depth: number;
  active: boolean;
  expanded: boolean;
  canExpand: boolean;
  icon: React.ReactNode;
  title: string;
  subtitle?: React.ReactNode;
  right?: React.ReactNode;
  onToggle?: () => void;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      style={rowIndentStyle(depth)}
      className={cn(
        "group flex w-full items-center gap-2 rounded-2xl border px-3 py-2 text-left transition",
        active
          ? "border-[color:var(--sinaxys-primary)]/40 bg-[color:var(--sinaxys-tint)]/55"
          : "border-[color:var(--sinaxys-border)] bg-white hover:bg-[color:var(--sinaxys-tint)]/35",
      )}
      onClick={onClick}
    >
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
        {icon}
      </span>

      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-2">
          <span className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{title}</span>
          {subtitle ? <span className="truncate text-xs text-muted-foreground">{subtitle}</span> : null}
        </span>
      </span>

      {right}

      {canExpand ? (
        <span
          className={cn(
            "ml-1 grid h-8 w-8 shrink-0 place-items-center rounded-xl text-muted-foreground transition group-hover:bg-white",
            active ? "bg-white" : "bg-transparent",
          )}
          onClick={(e) => {
            e.stopPropagation();
            onToggle?.();
          }}
        >
          {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        </span>
      ) : null}
    </button>
  );
}

function ObjectiveMeta({ o }: { o: DbOkrObjective }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Badge className={"rounded-full " + objectiveTypeBadgeClass(o.level)}>{objectiveTypeLabel(o.level)}</Badge>
      <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)] hover:bg-white">
        {objectiveLevelLabel(o.level)}
      </Badge>
      {o.status === "ACHIEVED" ? (
        <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)] hover:bg-white">Atingido</Badge>
      ) : null}
    </div>
  );
}

function averageObjectivePct(krs: DbOkrKeyResult[]) {
  const pcts = krs
    .map((k) => krProgressPct(k))
    .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (!pcts.length) return null;
  return Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
}

function StrategyLinker({
  cid,
  canEdit,
  objective,
  fundamentals,
  strategy,
  objectivesInCycle,
  onSaved,
}: {
  cid: string;
  canEdit: boolean;
  objective: DbOkrObjective;
  fundamentals: DbCompanyFundamentals | null;
  strategy: DbStrategyObjective[];
  objectivesInCycle: DbOkrObjective[];
  onSaved: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const otherObjectives = useMemo(
    () => objectivesInCycle.filter((o) => o.id !== objective.id).sort((a, b) => a.title.localeCompare(b.title)),
    [objectivesInCycle, objective.id],
  );

  const fundamentalOptions = useMemo(
    () =>
      [
        { key: "PURPOSE", label: "Propósito", field: "purpose" as const },
        { key: "VISION", label: "Visão", field: "vision" as const },
        { key: "MISSION", label: "Missão", field: "mission" as const },
        { key: "VALUES", label: "Valores", field: "values" as const },
        { key: "CULTURE", label: "Cultura", field: "culture" as const },
      ] as const,
    [],
  );

  const selectedFundamental = fundamentalOptions.find((o) => o.key === objective.linked_fundamental) ?? null;
  const selectedFundamentalItems = useMemo(() => {
    if (!selectedFundamental) return [];
    if (selectedFundamental.field === "values" || selectedFundamental.field === "culture") {
      return describedItemsToLines(parseDescribedItems((fundamentals as any)?.[selectedFundamental.field]));
    }
    return String((fundamentals as any)?.[selectedFundamental.field] ?? "")
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
  }, [fundamentals, selectedFundamental]);

  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Conexões</div>
          <div className="mt-1 text-sm text-muted-foreground">
            Vincule este objetivo a um pai e/ou a uma estratégia da empresa (e também a um fundamento específico).
          </div>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
          <Link2 className="h-5 w-5" />
        </div>
      </div>

      <Separator className="my-4" />

      <div className="grid gap-4">
        <div className="grid gap-2">
          <Label>Estratégia (objetivo de longo prazo)</Label>
          <Select
            disabled={!canEdit || saving}
            value={objective.strategy_objective_id ?? "__none__"}
            onValueChange={async (v) => {
              setSaving(true);
              try {
                await updateOkrObjective(objective.id, { strategy_objective_id: v === "__none__" ? null : v });
                toast({ title: "Vínculo com estratégia atualizado" });
                await onSaved();
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
            <SelectTrigger className="h-11 rounded-2xl bg-white">
              <SelectValue placeholder="Selecione…" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="__none__">Sem vínculo</SelectItem>
              {strategy.map((so) => (
                <SelectItem key={so.id} value={so.id}>
                  {so.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="grid gap-2">
          <Label>OKR pai (objetivo pai)</Label>
          <Select
            disabled={!canEdit || saving}
            value={objective.parent_objective_id ?? "__none__"}
            onValueChange={async (v) => {
              setSaving(true);
              try {
                await updateOkrObjective(objective.id, { parent_objective_id: v === "__none__" ? null : v });
                toast({ title: "OKR pai atualizado" });
                await onSaved();
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
            <SelectTrigger className="h-11 rounded-2xl bg-white">
              <SelectValue placeholder="Selecione…" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="__none__">Sem pai</SelectItem>
              {otherObjectives.map((o) => (
                <SelectItem key={o.id} value={o.id}>
                  {o.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-[11px] text-muted-foreground">Mostra objetivos do mesmo ciclo (trimestre/ano).</div>
        </div>

        <div className="grid gap-2">
          <Label>Fundamento (missão/visão/valores etc.)</Label>
          <Select
            disabled={!canEdit || saving}
            value={objective.linked_fundamental ?? "__none__"}
            onValueChange={async (v) => {
              setSaving(true);
              try {
                const next = v === "__none__" ? null : (v as DbOkrObjective["linked_fundamental"]);
                await updateOkrObjective(objective.id, { linked_fundamental: next, linked_fundamental_text: null });
                toast({ title: "Fundamento atualizado" });
                await onSaved();
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
            <SelectTrigger className="h-11 rounded-2xl bg-white">
              <SelectValue placeholder="Selecione…" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              <SelectItem value="__none__">Sem fundamento</SelectItem>
              {fundamentalOptions.map((o) => (
                <SelectItem key={o.key} value={o.key}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {objective.linked_fundamental ? (
          <div className="grid gap-2">
            <Label>Item do fundamento</Label>
            <Select
              disabled={!canEdit || saving}
              value={objective.linked_fundamental_text ?? "__none__"}
              onValueChange={async (v) => {
                setSaving(true);
                try {
                  await updateOkrObjective(objective.id, { linked_fundamental_text: v === "__none__" ? null : v });
                  toast({ title: "Item do fundamento atualizado" });
                  await onSaved();
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
              <SelectTrigger className="h-11 rounded-2xl bg-white">
                <SelectValue placeholder={selectedFundamentalItems.length ? "Selecione…" : "Sem itens cadastrados"} />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="__none__">Sem item</SelectItem>
                {selectedFundamentalItems.map((it) => (
                  <SelectItem key={it} value={it}>
                    {it}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {!selectedFundamentalItems.length ? (
              <div className="text-[11px] text-muted-foreground">Cadastre itens nesse fundamento para poder vincular.</div>
            ) : null}
          </div>
        ) : null}
      </div>
    </Card>
  );
}

function KrInlineEditor({ kr, canEdit, onSaved }: { kr: DbOkrKeyResult; canEdit: boolean; onSaved: () => void }) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState(kr.title);
  const [cur, setCur] = useState(typeof kr.current_value === "number" ? String(kr.current_value) : "");

  const pct = krProgressPct(kr);

  return (
    <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)] line-clamp-2">{kr.title}</div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
              {kr.kind === "DELIVERABLE" ? "Entregável" : "Métrico"}
            </Badge>
            {typeof pct === "number" ? <span>{pct}%</span> : <span>—</span>}
          </div>
        </div>
        {canEdit ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-[color:var(--sinaxys-tint)]/40 hover:text-[color:var(--sinaxys-ink)]"
            onClick={() => setEditing((v) => !v)}
            title={editing ? "Fechar" : "Editar"}
          >
            {editing ? <X className="h-4 w-4" /> : <Edit3 className="h-4 w-4" />}
          </Button>
        ) : null}
      </div>

      {typeof pct === "number" ? <Progress value={pct} className="mt-2 h-2 rounded-full bg-[color:var(--sinaxys-tint)]" /> : null}

      {editing ? (
        <div className="mt-3 grid gap-3">
          <div className="grid gap-2">
            <Label className="text-xs">Título</Label>
            <Input className="h-10 rounded-xl" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>

          {kr.kind === "METRIC" ? (
            <div className="grid gap-2">
              <Label className="text-xs">Valor atual</Label>
              <Input className="h-10 rounded-xl" value={cur} onChange={(e) => setCur(e.target.value)} placeholder="Ex.: 42" />
              <div className="text-[11px] text-muted-foreground">
                Início: {kr.start_value ?? "—"} • Meta: {kr.target_value ?? "—"} {kr.metric_unit ? `(${kr.metric_unit})` : ""}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3 rounded-xl bg-[color:var(--sinaxys-bg)] px-3 py-2">
              <div className="text-xs font-semibold text-[color:var(--sinaxys-ink)]">Concluído</div>
              <Button
                type="button"
                variant={kr.achieved ? "default" : "outline"}
                className={
                  kr.achieved
                    ? "h-9 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                    : "h-9 rounded-xl bg-white"
                }
                disabled={saving}
                onClick={async () => {
                  setSaving(true);
                  try {
                    const next = !kr.achieved;
                    await updateKeyResult(kr.id, { achieved: next, achieved_at: next ? new Date().toISOString() : null });
                    toast({ title: "KR atualizado" });
                    onSaved();
                  } catch (e) {
                    toast({
                      title: "Não foi possível atualizar",
                      description: e instanceof Error ? e.message : "Erro inesperado.",
                      variant: "destructive",
                    });
                  } finally {
                    setSaving(false);
                  }
                }}
              >
                {kr.achieved ? "Sim" : "Não"}
              </Button>
            </div>
          )}

          <div className="flex justify-end">
            <Button
              type="button"
              className="h-10 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={saving || title.trim().length < 4}
              onClick={async () => {
                setSaving(true);
                try {
                  const patch: Parameters<typeof updateKeyResult>[1] = { title: title.trim() };
                  if (kr.kind === "METRIC") {
                    const n = Number(cur.trim());
                    patch.current_value = Number.isFinite(n) ? n : null;
                  }
                  await updateKeyResult(kr.id, patch);
                  toast({ title: "KR atualizado" });
                  onSaved();
                  setEditing(false);
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
        </div>
      ) : null}
    </div>
  );
}

function DetailsBody({
  node,
  cid,
  canEdit,
  fundamentals,
  strategy,
  cycles,
  objectiveById,
  cycleById,
  onInvalidate,
  onSelect,
}: {
  node: Node;
  cid: string;
  canEdit: boolean;
  fundamentals: DbCompanyFundamentals | null;
  strategy: DbStrategyObjective[];
  cycles: DbOkrCycle[];
  objectiveById: Map<string, DbOkrObjective>;
  cycleById: Map<string, DbOkrCycle>;
  onInvalidate: () => Promise<void>;
  onSelect?: (n: Node) => void;
}) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const objectiveId = node.kind === "objective" ? node.objectiveId : null;

  const qObjective = useQuery({
    queryKey: ["okr-objective", objectiveId],
    enabled: !!objectiveId && !objectiveById.has(objectiveId),
    queryFn: () => getOkrObjective(objectiveId as string),
    staleTime: 20_000,
  });

  useEffect(() => {
    if (!objectiveId) return;
    if (!qObjective.data) return;
    objectiveById.set(objectiveId, qObjective.data);
  }, [objectiveById, objectiveId, qObjective.data]);

  const objective = objectiveId ? (objectiveById.get(objectiveId) ?? qObjective.data ?? null) : null;

  const qKrs = useQuery({
    queryKey: ["okr-krs", objectiveId],
    enabled: !!objectiveId,
    queryFn: () => listKeyResults(objectiveId as string),
  });

  const pct = useMemo(() => {
    if (!objectiveId) return null;
    return averageObjectivePct(qKrs.data ?? []);
  }, [objectiveId, qKrs.data]);

  return (
    <div className="grid gap-4">
      {node.kind === "fundamentals" ? (
        <FundamentalsPicker
          cid={cid}
          canEdit={canEdit}
          fundamentals={fundamentals}
          onSaved={async () => {
            await qc.invalidateQueries({ queryKey: ["okr-fundamentals", cid] });
            toast({ title: "Fundamentos atualizados" });
            await onInvalidate();
          }}
        />
      ) : null}

      {node.kind === "strategy" ? (
        <StrategyPicker
          cid={cid}
          canEdit={canEdit}
          strategy={strategy}
          onSaved={async () => {
            await qc.invalidateQueries({ queryKey: ["okr-strategy", cid] });
            toast({ title: "Objetivo atualizado" });
            await onInvalidate();
          }}
        />
      ) : null}

      {node.kind === "cycles" ? (
        <CyclesPicker
          cid={cid}
          cycles={cycles}
          onPickObjective={(objectiveId) => {
            onSelect?.({ kind: "objective", id: `o:${objectiveId}`, objectiveId });
          }}
        />
      ) : null}

      {node.kind === "objective" ? (
        objective ? (
          <ObjectiveEditor
            canEdit={canEdit}
            objective={objective}
            pct={pct}
            krs={qKrs.data ?? []}
            loadingKrs={qKrs.isLoading}
            onSaved={async () => {
              await Promise.all([
                qc.invalidateQueries({ queryKey: ["okr-quarter-objectives", cid] }),
                qc.invalidateQueries({ queryKey: ["okr-objectives", cid] }),
                qc.invalidateQueries({ queryKey: ["okr-krs", objectiveId] }),
                qc.invalidateQueries({ queryKey: ["okr-cycle-objectives", cid] }),
                qc.invalidateQueries({ queryKey: ["okr-map-cycle-objectives", cid] }),
                qc.invalidateQueries({ queryKey: ["okr-objective", objectiveId] }),
              ]);
              await onInvalidate();
            }}
            companyId={cid}
            strategy={strategy}
            fundamentals={fundamentals}
          />
        ) : (
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
            <div className="text-sm text-muted-foreground">Carregando objetivo…</div>
          </Card>
        )
      ) : null}

      {/* Keep these paths for Tree mode direct clicks */}
      {node.kind === "fundamental" ? (
        <FundamentalEditor
          cid={cid}
          canEdit={canEdit}
          field={node.field}
          fundamentals={fundamentals}
          onSaved={async () => {
            await qc.invalidateQueries({ queryKey: ["okr-fundamentals", cid] });
            toast({ title: "Fundamentos atualizados" });
          }}
        />
      ) : null}

      {node.kind === "strategyObjective" ? (
        <StrategyObjectiveEditor
          canEdit={canEdit}
          so={strategy.find((s) => s.id === node.soId) ?? null}
          onSaved={async () => {
            await qc.invalidateQueries({ queryKey: ["okr-strategy", cid] });
            toast({ title: "Objetivo atualizado" });
          }}
        />
      ) : null}

      {node.kind === "cycle" ? (
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{cycleLabel(cycleById.get(node.cycleId)!)}</div>
              <div className="mt-1 text-sm text-muted-foreground">Abra o ciclo para gerenciar objetivos e KRs.</div>
            </div>
            <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
              <CalendarClock className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-4">
            <Button asChild variant="outline" className="h-11 rounded-xl bg-white">
              <Link to="/okr/ciclos">Abrir ciclos</Link>
            </Button>
          </div>
        </Card>
      ) : null}

      {node.kind === "root" ? (
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
          <div className="text-sm text-muted-foreground">Selecione um item para ver detalhes, editar e vincular.</div>
        </Card>
      ) : null}
    </div>
  );
}

function DetailsShell({
  node,
  cid,
  canEdit,
  fundamentals,
  strategy,
  cycles,
  objectiveById,
  cycleById,
  onInvalidate,
  onSelect,
}: {
  node: Node;
  cid: string;
  canEdit: boolean;
  fundamentals: DbCompanyFundamentals | null;
  strategy: DbStrategyObjective[];
  cycles: DbOkrCycle[];
  objectiveById: Map<string, DbOkrObjective>;
  cycleById: Map<string, DbOkrCycle>;
  onInvalidate: () => Promise<void>;
  onSelect?: (n: Node) => void;
}) {
  const title = useMemo(() => {
    if (node.kind === "fundamental") return nodeTitle(node);
    if (node.kind === "cycle") return cycleLabel(cycleById.get(node.cycleId)!);
    if (node.kind === "objective") return objectiveById.get(node.objectiveId)?.title ?? "Objetivo";
    if (node.kind === "strategyObjective") return strategy.find((s) => s.id === node.soId)?.title ?? "Objetivo longo prazo";
    if (node.kind === "fundamentals") return "Fundamentos";
    if (node.kind === "strategy") return "Objetivos de longo prazo";
    if (node.kind === "cycles") return "Ciclos";
    return nodeTitle(node);
  }, [node, cycleById, objectiveById, strategy]);

  return (
    <div className="overflow-hidden rounded-3xl border border-[color:var(--sinaxys-border)] bg-white">
      <div className="border-b border-[color:var(--sinaxys-border)] p-5">
        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{title}</div>
      </div>
      <ScrollArea className="h-[calc(100vh-220px)] p-5">
        <DetailsBody
          node={node}
          cid={cid}
          canEdit={canEdit}
          fundamentals={fundamentals}
          strategy={strategy}
          cycles={cycles}
          objectiveById={objectiveById}
          cycleById={cycleById}
          onInvalidate={onInvalidate}
          onSelect={onSelect}
        />
      </ScrollArea>
    </div>
  );
}

type TreeCtx = {
  cid: string;
  activeId: NodeId;
  expanded: Record<string, boolean>;
  toggle: (id: string) => void;
  select: (n: Node) => void;
  canEdit: boolean;
};

function Tree({
  ctx,
  fundamentals,
  strategy,
  cycles,
}: {
  ctx: TreeCtx;
  fundamentals: DbCompanyFundamentals | null;
  strategy: DbStrategyObjective[];
  cycles: DbOkrCycle[];
}) {
  const cycleGroups = useMemo(() => {
    const annual = cycles.filter((c) => c.type === "ANNUAL").sort((a, b) => b.year - a.year);
    const quarterly = cycles.filter((c) => c.type === "QUARTERLY").sort((a, b) => (b.year - a.year) || ((b.quarter ?? 0) - (a.quarter ?? 0)));
    return { annual, quarterly };
  }, [cycles]);

  const q = useQuery({
    queryKey: ["okr-map-objectives", ctx.cid, "expanded-cycles", Object.keys(ctx.expanded).filter((k) => k.startsWith("c:") && ctx.expanded[k]).join(",")],
    enabled: true,
    queryFn: async () => {
      // Lazy load objectives only for expanded cycles.
      const expandedCycleIds = Object.keys(ctx.expanded)
        .filter((k) => k.startsWith("c:") && ctx.expanded[k])
        .map((k) => k.slice(2));

      const byCycle = new Map<string, DbOkrObjective[]>();
      await Promise.all(
        expandedCycleIds.map(async (cycleId) => {
          const objs = await listOkrObjectives(ctx.cid, cycleId);
          byCycle.set(cycleId, objs);
        }),
      );
      return byCycle;
    },
    staleTime: 20_000,
  });

  const objectivesByCycle = q.data ?? new Map<string, DbOkrObjective[]>();

  const fundamentalsFields: Array<{ field: keyof DbCompanyFundamentals; icon: React.ReactNode }> = [
    { field: "purpose", icon: <Route className="h-4 w-4" /> },
    { field: "vision", icon: <Route className="h-4 w-4" /> },
    { field: "mission", icon: <Route className="h-4 w-4" /> },
    { field: "values", icon: <Route className="h-4 w-4" /> },
    { field: "culture", icon: <Route className="h-4 w-4" /> },
  ];

  return (
    <div className="grid gap-3">
      {/* Fundamentos */}
      <Row
        depth={0}
        active={ctx.activeId === "fundamentals"}
        expanded={!!ctx.expanded["fundamentals"]}
        canExpand
        icon={<Route className="h-4 w-4" />}
        title="Fundamentos"
        subtitle={"Missão, visão, valores e cultura"}
        onToggle={() => ctx.toggle("fundamentals")}
        onClick={() => ctx.select({ kind: "fundamentals", id: "fundamentals" })}
      />

      {ctx.expanded["fundamentals"] ? (
        <div className="grid gap-2">
          {fundamentalsFields.map(({ field, icon }) => (
            <Row
              key={field}
              depth={1}
              active={ctx.activeId === `fund:${field}`}
              expanded={false}
              canExpand={false}
              icon={icon}
              title={nodeTitle({ kind: "fundamental", id: `fund:${field}` as any, field })}
              subtitle={
                typeof (fundamentals as any)?.[field] === "string" && String((fundamentals as any)[field]).trim().length
                  ? "preenchido"
                  : "vazio"
              }
              right={
                <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
                  {typeof (fundamentals as any)?.[field] === "string" && String((fundamentals as any)[field]).trim().length ? "OK" : "—"}
                </Badge>
              }
              onClick={() => ctx.select({ kind: "fundamental", id: `fund:${field}` as any, field })}
            />
          ))}

          {/* Placeholder when nothing is filled yet */}
          {fundamentalsFields.every(
            ({ field }) => !(typeof (fundamentals as any)?.[field] === "string" && String((fundamentals as any)[field]).trim().length),
          ) ? (
            <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">
              Nenhum fundamento preenchido ainda. Clique em um item para preencher rapidamente.
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Longo prazo */}
      <Row
        depth={0}
        active={ctx.activeId === "strategy"}
        expanded={!!ctx.expanded["strategy"]}
        canExpand
        icon={<Flag className="h-4 w-4" />}
        title="Objetivos de longo prazo"
        subtitle={"1–10 anos"}
        right={
          <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
            {strategy.length}
          </Badge>
        }
        onToggle={() => ctx.toggle("strategy")}
        onClick={() => ctx.select({ kind: "strategy", id: "strategy" })}
      />

      {ctx.expanded["strategy"] ? (
        <div className="grid gap-2">
          {strategy.map((so) => (
            <Row
              key={so.id}
              depth={1}
              active={ctx.activeId === `so:${so.id}`}
              expanded={false}
              canExpand={false}
              icon={<Flag className="h-4 w-4" />}
              title={so.title}
              subtitle={`${so.horizon_years} anos`}
              right={
                <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">{so.horizon_years}a</Badge>
              }
              onClick={() => ctx.select({ kind: "strategyObjective", id: `so:${so.id}`, soId: so.id })}
            />
          ))}
          {!strategy.length ? (
            <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">
              Nenhum objetivo de longo prazo ainda. Crie um para orientar as decisões do ano.
              <div className="mt-3">
                <Button asChild variant="outline" className="h-10 rounded-xl bg-white">
                  <Link to="/okr/mapa">Criar objetivo (use o botão no topo)</Link>
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Ciclos */}
      <Row
        depth={0}
        active={ctx.activeId === "cycles"}
        expanded={!!ctx.expanded["cycles"]}
        canExpand
        icon={<Layers className="h-4 w-4" />}
        title="OKRs (ciclos)"
        subtitle={"Ano e trimestre"}
        right={
          <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
            {cycles.length}
          </Badge>
        }
        onToggle={() => ctx.toggle("cycles")}
        onClick={() => ctx.select({ kind: "cycles", id: "cycles" })}
      />

      {ctx.expanded["cycles"] ? (
        <div className="grid gap-3">
          <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Anual</div>
            <div className="mt-2 grid gap-2">
              {cycleGroups.annual.length ? (
                cycleGroups.annual.map((c) => {
                  const expanded = !!ctx.expanded[`c:${c.id}`];
                  const objs = objectivesByCycle.get(c.id) ?? [];
                  return (
                    <div key={c.id} className="grid gap-2">
                      <Row
                        depth={1}
                        active={ctx.activeId === `c:${c.id}`}
                        expanded={expanded}
                        canExpand
                        icon={<CalendarClock className="h-4 w-4" />}
                        title={cycleLabel(c)}
                        subtitle={c.status}
                        right={
                          <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
                            {expanded ? objs.length : "…"}
                          </Badge>
                        }
                        onToggle={() => ctx.toggle(`c:${c.id}`)}
                        onClick={() => ctx.select({ kind: "cycle", id: `c:${c.id}`, cycleId: c.id })}
                      />

                      {expanded ? (
                        <div className="grid gap-2 pl-3">
                          {objs.length ? (
                            objs.map((o) => (
                              <Row
                                key={o.id}
                                depth={2}
                                active={ctx.activeId === `o:${o.id}`}
                                expanded={false}
                                canExpand={false}
                                icon={<Target className="h-4 w-4" />}
                                title={o.title}
                                subtitle={
                                  <span className="inline-flex items-center gap-2">
                                    <span className="font-medium text-[color:var(--sinaxys-ink)]">{objectiveTypeLabel(o.level)}</span>
                                    <span>•</span>
                                    <span>{objectiveLevelLabel(o.level)}</span>
                                  </span>
                                }
                                onClick={() => ctx.select({ kind: "objective", id: `o:${o.id}`, objectiveId: o.id })}
                              />
                            ))
                          ) : (
                            <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-3 text-sm text-muted-foreground">Sem objetivos ainda.</div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-3 text-sm text-muted-foreground">
                  Nenhum ciclo anual cadastrado.
                  <div className="mt-3">
                    <Button asChild variant="outline" className="h-10 rounded-xl bg-white">
                      <Link to="/okr/ciclos">Criar ciclo anual</Link>
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trimestral</div>
            <div className="mt-2 grid gap-2">
              {cycleGroups.quarterly.length ? (
                cycleGroups.quarterly.slice(0, 8).map((c) => {
                  const expanded = !!ctx.expanded[`c:${c.id}`];
                  const objs = objectivesByCycle.get(c.id) ?? [];
                  return (
                    <div key={c.id} className="grid gap-2">
                      <Row
                        depth={1}
                        active={ctx.activeId === `c:${c.id}`}
                        expanded={expanded}
                        canExpand
                        icon={<CalendarClock className="h-4 w-4" />}
                        title={cycleLabel(c)}
                        subtitle={c.status}
                        right={
                          <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
                            {expanded ? objs.length : "…"}
                          </Badge>
                        }
                        onToggle={() => ctx.toggle(`c:${c.id}`)}
                        onClick={() => ctx.select({ kind: "cycle", id: `c:${c.id}`, cycleId: c.id })}
                      />

                      {expanded ? (
                        <div className="grid gap-2 pl-3">
                          {objs.length ? (
                            objs.map((o) => (
                              <Row
                                key={o.id}
                                depth={2}
                                active={ctx.activeId === `o:${o.id}`}
                                expanded={false}
                                canExpand={false}
                                icon={<CircleDot className="h-4 w-4" />}
                                title={o.title}
                                subtitle={
                                  <span className="inline-flex items-center gap-2">
                                    <span className="font-medium text-[color:var(--sinaxys-ink)]">{objectiveTypeLabel(o.level)}</span>
                                    <span>•</span>
                                    <span>{objectiveLevelLabel(o.level)}</span>
                                  </span>
                                }
                                onClick={() => ctx.select({ kind: "objective", id: `o:${o.id}`, objectiveId: o.id })}
                              />
                            ))
                          ) : (
                            <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-3 text-sm text-muted-foreground">Sem objetivos ainda.</div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  );
                })
              ) : (
                <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-3 text-sm text-muted-foreground">
                  Nenhum ciclo trimestral cadastrado.
                  <div className="mt-3">
                    <Button asChild variant="outline" className="h-10 rounded-xl bg-white">
                      <Link to="/okr/ciclos">Criar ciclo trimestral</Link>
                    </Button>
                  </div>
                </div>
              )}

              {cycleGroups.quarterly.length > 8 ? (
                <div className="text-xs text-muted-foreground">Mostrando os 8 ciclos trimestrais mais recentes.</div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function ListView({
  fundamentals,
  strategy,
  cycles,
  onPick,
}: {
  fundamentals: DbCompanyFundamentals | null;
  strategy: DbStrategyObjective[];
  cycles: DbOkrCycle[];
  onPick: (n: Node) => void;
}) {
  const hasFundamentals =
    !!fundamentals &&
    [fundamentals.mission, fundamentals.vision, fundamentals.purpose, fundamentals.values, fundamentals.culture].some((t) => !!t?.trim());

  const quarterlyCount = cycles.filter((c) => c.type === "QUARTERLY").length;
  const annualCount = cycles.filter((c) => c.type === "ANNUAL").length;

  return (
    <div className="grid gap-3">
      <button
        type="button"
        className="w-full rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-5 text-left hover:bg-[color:var(--sinaxys-tint)]/15"
        onClick={() => onPick({ kind: "fundamentals", id: "fundamentals" })}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Fundamentos</div>
            <div className="mt-1 text-sm text-muted-foreground">Selecione para editar itens (propósito, visão, missão…).</div>
          </div>
          <Badge className={cn("rounded-full", hasFundamentals ? "bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)]" : "bg-white ring-1 ring-[color:var(--sinaxys-border)]")}>
            {hasFundamentals ? "OK" : "Setup"}
          </Badge>
        </div>
      </button>

      <button
        type="button"
        className="w-full rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-5 text-left hover:bg-[color:var(--sinaxys-tint)]/15"
        onClick={() => onPick({ kind: "strategy", id: "strategy" })}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Objetivos de longo prazo</div>
            <div className="mt-1 text-sm text-muted-foreground">Selecione para escolher e editar.</div>
          </div>
          <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)]">{strategy.length}</Badge>
        </div>
      </button>

      <button
        type="button"
        className="w-full rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-5 text-left hover:bg-[color:var(--sinaxys-tint)]/15"
        onClick={() => onPick({ kind: "cycles", id: "cycles" })}
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Ciclos</div>
            <div className="mt-1 text-sm text-muted-foreground">Trimestral primeiro, depois anual.</div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)]">Q {quarterlyCount}</Badge>
            <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)]">A {annualCount}</Badge>
          </div>
        </div>
      </button>

      {/* Shortcut for power users: keep ability to jump to objective editor from a cycle picker on the right */}
      <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-5 text-sm text-muted-foreground">
        Dica: escolha um item acima e use os seletores no painel da direita para navegar e editar.
      </div>
    </div>
  );
}

function FundamentalEditor({
  cid,
  canEdit,
  field,
  fundamentals,
  onSaved,
}: {
  cid: string;
  canEdit: boolean;
  field: keyof DbCompanyFundamentals;
  fundamentals: DbCompanyFundamentals | null;
  onSaved: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [items, setItems] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);

  const describedFields = field === "values" || field === "culture";
  const [described, setDescribed] = useState<DescribedItem[]>([]);
  const [text, setText] = useState("");

  useEffect(() => {
    const raw = String((fundamentals as any)?.[field] ?? "");
    setItems(raw.split("\n").map((s) => s.trim()).filter(Boolean));
    setDescribed(parseDescribedItems(raw));
    setText(raw);
    setDraft("");
    setSaving(false);
  }, [field, fundamentals?.updated_at]);

  const label = nodeTitle({ kind: "fundamental", id: `fund:${field}` as any, field });

  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{label}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {describedFields
              ? "Cadastre itens com nome + descritivo."
              : "Use um texto claro (pode ter parágrafos)."}
          </div>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
          <Route className="h-5 w-5" />
        </div>
      </div>

      <Separator className="my-4" />

      {describedFields ? (
        <DescribedItemsEditor
          label={label}
          hint={field === "values" ? "Valores com nome + descritivo." : "Cultura com nome + descritivo."}
          items={described}
          onChange={setDescribed}
          canEdit={canEdit}
          saving={saving}
          addLabel={field === "values" ? "Adicionar valor" : "Adicionar item"}
        />
      ) : (
        <div className="grid gap-3">
          <Label className="text-sm">Texto</Label>
          <Textarea
            className="min-h-[180px] rounded-2xl"
            value={text}
            disabled={!canEdit || saving}
            onChange={(e) => setText(e.target.value)}
            placeholder={`Escreva ${label.toLowerCase()}…`}
          />
        </div>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button asChild variant="outline" className="h-10 rounded-xl bg-white">
          <Link to="/okr/fundamentos">Editar tudo</Link>
        </Button>
        {canEdit ? (
          <Button
            className="h-10 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
            disabled={saving}
            onClick={async () => {
              setSaving(true);
              try {
                const patch: Partial<DbCompanyFundamentals> =
                  describedFields
                    ? ({ [field]: serializeDescribedItems(described) || null } as any)
                    : ({ [field]: text.trim() || null } as any);

                await upsertCompanyFundamentals(cid, patch);
                await onSaved();
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
        ) : null}
      </div>
    </Card>
  );
}

function StrategyObjectiveEditor({
  canEdit,
  so,
  onSaved,
}: {
  canEdit: boolean;
  so: DbStrategyObjective | null;
  onSaved: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [title, setTitle] = useState(so?.title ?? "");
  const [description, setDescription] = useState(so?.description ?? "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setTitle(so?.title ?? "");
    setDescription(so?.description ?? "");
    setSaving(false);
  }, [so?.id]);

  if (!so) {
    return (
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
        <div className="text-sm text-muted-foreground">Objetivo não encontrado.</div>
      </Card>
    );
  }

  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Objetivo ({so.horizon_years} anos)</div>
          <div className="mt-1 text-sm text-muted-foreground">Aposta de longo prazo que orienta decisões do ano.</div>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
          <Flag className="h-5 w-5" />
        </div>
      </div>

      <Separator className="my-4" />

      <div className="grid gap-3">
        <div className="grid gap-2">
          <Label>Título</Label>
          <Input className="h-11 rounded-xl" value={title} onChange={(e) => setTitle(e.target.value)} disabled={!canEdit || saving} />
        </div>
        <div className="grid gap-2">
          <Label>Descrição</Label>
          <Textarea className="min-h-[120px] rounded-2xl" value={description} onChange={(e) => setDescription(e.target.value)} disabled={!canEdit || saving} />
        </div>
      </div>

      {canEdit ? (
        <div className="mt-4 flex justify-end">
          <Button
            className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
            disabled={saving || title.trim().length < 6}
            onClick={async () => {
              setSaving(true);
              try {
                await updateStrategyObjective(so.id, { title, description });
                await onSaved();
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
    </Card>
  );
}

function ObjectiveEditor({
  canEdit,
  objective,
  pct,
  krs,
  loadingKrs,
  onSaved,
  companyId,
  strategy,
  fundamentals,
}: {
  canEdit: boolean;
  objective: DbOkrObjective | null;
  pct: number | null;
  krs: DbOkrKeyResult[];
  loadingKrs: boolean;
  onSaved: () => Promise<void>;
  companyId: string;
  strategy: DbStrategyObjective[];
  fundamentals: DbCompanyFundamentals | null;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState(objective?.title ?? "");
  const [description, setDescription] = useState(objective?.description ?? "");
  const [reason, setReason] = useState(objective?.strategic_reason ?? "");

  useEffect(() => {
    setEditing(false);
    setSaving(false);
    setTitle(objective?.title ?? "");
    setDescription(objective?.description ?? "");
    setReason(objective?.strategic_reason ?? "");
  }, [objective?.id]);

  const qCycleObjectives = useQuery({
    queryKey: ["okr-cycle-objectives", companyId, objective?.cycle_id ?? null],
    enabled: !!objective?.cycle_id,
    queryFn: async () => listOkrObjectives(companyId, (objective as any).cycle_id),
    staleTime: 15_000,
  });

  if (!objective) {
    return (
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
        <div className="text-sm text-muted-foreground">Objetivo não encontrado.</div>
      </Card>
    );
  }

  const canEditThis = canEdit; // minimal rule for now

  return (
    <div className="grid gap-4">
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)] line-clamp-2">{objective.title}</div>
            <div className="mt-2">
              <ObjectiveMeta o={objective} />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="h-10 rounded-xl bg-white">
              <Link to={`/okr/objetivos/${objective.id}`}>Abrir</Link>
            </Button>
            {canEditThis ? (
              <Button type="button" variant="outline" className="h-10 rounded-xl bg-white" onClick={() => setEditing((v) => !v)}>
                <Edit3 className="mr-2 h-4 w-4" />
                {editing ? "Fechar" : "Editar"}
              </Button>
            ) : null}
          </div>
        </div>

        {typeof pct === "number" ? (
          <div className="mt-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Andamento (média dos KRs)</span>
              <span className="font-semibold text-[color:var(--sinaxys-ink)]">{pct}%</span>
            </div>
            <Progress value={pct} className="mt-2 h-2 rounded-full bg-[color:var(--sinaxys-tint)]" />
          </div>
        ) : null}

        {editing ? (
          <div className="mt-4 grid gap-3">
            <div className="grid gap-2">
              <Label>Título</Label>
              <Input className="h-11 rounded-xl" value={title} onChange={(e) => setTitle(e.target.value)} disabled={saving} />
            </div>
            <div className="grid gap-2">
              <Label>Descrição</Label>
              <Textarea className="min-h-[96px] rounded-2xl" value={description} onChange={(e) => setDescription(e.target.value)} disabled={saving} />
            </div>
            <div className="grid gap-2">
              <Label>Motivo estratégico</Label>
              <Textarea className="min-h-[96px] rounded-2xl" value={reason} onChange={(e) => setReason(e.target.value)} disabled={saving} />
            </div>

            <div className="flex justify-end">
              <Button
                className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                disabled={saving || title.trim().length < 6}
                onClick={async () => {
                  setSaving(true);
                  try {
                    await updateOkrObjective(objective.id, {
                      title,
                      description,
                      strategic_reason: reason,
                    });
                    toast({ title: "Objetivo atualizado" });
                    await onSaved();
                    setEditing(false);
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
          </div>
        ) : null}
      </Card>

      <StrategyLinker
        cid={companyId}
        canEdit={canEditThis}
        objective={objective}
        fundamentals={fundamentals}
        strategy={strategy}
        objectivesInCycle={qCycleObjectives.data ?? []}
        onSaved={onSaved}
      />

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Key Results</div>
            <div className="mt-1 text-sm text-muted-foreground">Atualize andamento e ajuste KRs sem sair do mapa.</div>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
            <Target className="h-5 w-5" />
          </div>
        </div>

        <Separator className="my-4" />

        {loadingKrs ? (
          <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Carregando KRs…</div>
        ) : krs.length ? (
          <div className="grid gap-3">
            {krs.map((kr) => (
              <KrInlineEditor
                key={kr.id}
                kr={kr}
                canEdit={canEditThis}
                onSaved={async () => {
                  await onSaved();
                }}
              />
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Sem KRs ainda.</div>
        )}
      </Card>
    </div>
  );
}

type TreePayload = {
  objectivesByCycle: Record<string, DbOkrObjective[]>;
  krsByObjective: Record<string, DbOkrKeyResult[]>;
};

type TreeItem = {
  kind: "group" | "fundamentals" | "fundamental" | "strategy" | "strategyObjective" | "cycles" | "cycle" | "objective" | "kr";
  title: string;
  subtitle?: string;
  pill?: string;
  tone: "fund" | "strategy" | "cycles" | "objective";
  pick?: Node;
  activeKey?: NodeId;
  href?: string;
  owner_user_id?: string | null;
  accent_hue?: number;
  accent_depth?: number;
};

function toneClass(t: TreeItem["tone"]) {
  if (t === "fund") return "bg-sky-50 text-sky-900 ring-sky-200";
  if (t === "strategy") return "bg-violet-50 text-violet-900 ring-violet-200";
  if (t === "cycles") return "bg-emerald-50 text-emerald-900 ring-emerald-200";
  return "bg-amber-50 text-amber-950 ring-amber-200";
}

function TreeNodeCard({
  item,
  active,
  onPick,
  peopleById,
}: {
  item: TreeItem;
  active: boolean;
  onPick: (n: Node) => void;
  peopleById: Map<string, DbProfilePublic>;
}) {
  const person = item.owner_user_id ? peopleById.get(item.owner_user_id) ?? null : null;

  const accentHue = typeof item.accent_hue === "number" ? item.accent_hue : null;
  const accentDepth = item.accent_depth ?? 0;
  const accentLightness = accentHue == null ? null : Math.max(42, Math.min(72, 46 + accentDepth * 10));
  const accent = accentHue == null ? null : `hsl(${accentHue} 70% ${accentLightness}%)`;
  const accentSoft = accentHue == null ? null : `hsl(${accentHue} 70% 97%)`;

  const shell = (
    <div
      className={cn(
        "relative min-w-[220px] max-w-[280px] overflow-hidden rounded-3xl border bg-white px-4 py-3 text-left shadow-sm transition",
        active
          ? "border-[color:var(--sinaxys-primary)]/40 ring-2 ring-[color:var(--sinaxys-primary)]/15"
          : "border-[color:var(--sinaxys-border)] hover:bg-[color:var(--sinaxys-tint)]/10",
      )}
      style={
        accent
          ? {
              borderColor: active ? undefined : `color-mix(in srgb, ${accent} 28%, var(--sinaxys-border))`,
              backgroundColor: accentSoft,
            }
          : undefined
      }
    >
      {accent ? <div className="absolute left-0 top-0 h-full w-1.5" style={{ background: accent }} /> : null}

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{item.title}</div>
          {item.subtitle ? <div className="mt-1 line-clamp-2 text-xs text-muted-foreground">{item.subtitle}</div> : null}
        </div>

        <div className="flex items-center gap-2">
          {person ? (
            <div className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-2xl border bg-white" style={accent ? { borderColor: accent } : undefined}>
              {person.avatar_url ? (
                <img src={person.avatar_url} alt={person.name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-xs font-bold text-[color:var(--sinaxys-ink)]">{initials(person.name)}</span>
              )}
            </div>
          ) : item.kind === "objective" || item.kind === "kr" ? (
            <div className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-[color:var(--sinaxys-border)] bg-white text-[color:var(--sinaxys-primary)]">
              <UserRound className="h-4 w-4" />
            </div>
          ) : null}

          {item.pill ? (
            <span className={cn("shrink-0 rounded-full px-2 py-1 text-[11px] font-semibold ring-1", accent ? "bg-white text-[color:var(--sinaxys-ink)]" : toneClass(item.tone))}>
              {item.pill}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );

  if (item.href) {
    return (
      <Link to={item.href} className="block focus:outline-none">
        {shell}
      </Link>
    );
  }

  if (!item.pick) return <div>{shell}</div>;

  return (
    <button type="button" className="block focus:outline-none" onClick={() => onPick(item.pick!)}>
      {shell}
    </button>
  );
}

function OkrMapTreeCanvas({
  cid,
  fundamentals,
  strategy,
  cycles,
  activeId,
  onPick,
  objectiveById,
  peopleById,
}: {
  cid: string;
  fundamentals: DbCompanyFundamentals | null;
  strategy: DbStrategyObjective[];
  cycles: DbOkrCycle[];
  activeId: NodeId;
  onPick: (n: Node) => void;
  objectiveById: Map<string, DbOkrObjective>;
  peopleById: Map<string, DbProfilePublic>;
}) {
  const cycleGroups = useMemo(() => {
    const annual = cycles.filter((c) => c.type === "ANNUAL").sort((a, b) => b.year - a.year);
    const quarterly = cycles.filter((c) => c.type === "QUARTERLY").sort((a, b) => (b.year - a.year) || ((b.quarter ?? 0) - (a.quarter ?? 0)));
    return { annual, quarterly };
  }, [cycles]);

  const cyclesKey = useMemo(
    () => [...cycleGroups.quarterly.map((c) => c.id), ...cycleGroups.annual.map((c) => c.id)].join(","),
    [cycleGroups.annual, cycleGroups.quarterly],
  );

  const qTree = useQuery<TreePayload>({
    queryKey: ["okr-map-tree", cid, cyclesKey],
    enabled: cycles.length > 0,
    queryFn: async () => {
      const objectivesByCycle: Record<string, DbOkrObjective[]> = {};
      const krsByObjective: Record<string, DbOkrKeyResult[]> = {};

      // Carrega tudo para permitir "linkar" a estratégia até o KR na mesma tela.
      await Promise.all(
        cycles.map(async (c) => {
          const objs = await listOkrObjectives(cid, c.id);
          objectivesByCycle[c.id] = objs;
          for (const o of objs) objectiveById.set(o.id, o);

          await Promise.all(
            objs.map(async (o) => {
              const krs = await listKeyResults(o.id);
              krsByObjective[o.id] = krs;
            }),
          );
        }),
      );

      return { objectivesByCycle, krsByObjective };
    },
    staleTime: 20_000,
  });

  const fundamentalsFields: Array<{ field: keyof DbCompanyFundamentals; label: string }> = [
    { field: "purpose", label: "Propósito" },
    { field: "vision", label: "Visão" },
    { field: "mission", label: "Missão" },
    { field: "values", label: "Valores" },
    { field: "culture", label: "Cultura" },
  ];

  const roots = useMemo((): OrgNode<TreeItem>[] => {
    const data = qTree.data;

    const fundamentalsNode: OrgNode<TreeItem> = {
      id: "fundamentals",
      data: {
        kind: "fundamentals",
        title: "Fundamentos",
        subtitle: "Missão, visão, valores e cultura",
        pill: "Base",
        tone: "fund",
        pick: { kind: "fundamentals", id: "fundamentals" },
        activeKey: "fundamentals",
      },
      children: fundamentalsFields.map((f) => ({
        id: `fund:${String(f.field)}`,
        data: {
          kind: "fundamental",
          title: f.label,
          subtitle: parseListValue(String((fundamentals as any)?.[f.field] ?? "")).slice(0, 2).join(" • ") || "—",
          tone: "fund",
          pick: { kind: "fundamental", id: `fund:${f.field}` as any, field: f.field },
          activeKey: `fund:${f.field}` as any,
        },
        children: [],
      })),
    };

    const strategyNode: OrgNode<TreeItem> = {
      id: "strategy",
      data: {
        kind: "strategy",
        title: "Objetivos de longo prazo",
        subtitle: "1–10 anos",
        pill: String(strategy.length),
        tone: "strategy",
        pick: { kind: "strategy", id: "strategy" },
        activeKey: "strategy",
      },
      children: strategy.map((so) => ({
        id: `so:${so.id}`,
        data: {
          kind: "strategyObjective",
          title: so.title,
          subtitle: so.description?.trim() ? so.description.trim() : `${so.horizon_years} anos`,
          pill: `${so.horizon_years}a`,
          tone: "strategy",
          pick: { kind: "strategyObjective", id: `so:${so.id}`, soId: so.id },
          activeKey: `so:${so.id}`,
        },
        children: [],
      })),
    };

    const buildObjectiveForest = (objs: DbOkrObjective[]) => {
      const byId = new Map(objs.map((o) => [o.id, o] as const));
      const childrenByParent = new Map<string, DbOkrObjective[]>();
      const roots: DbOkrObjective[] = [];

      for (const o of objs) {
        if (o.parent_objective_id && byId.has(o.parent_objective_id)) {
          const arr = childrenByParent.get(o.parent_objective_id) ?? [];
          arr.push(o);
          childrenByParent.set(o.parent_objective_id, arr);
        } else {
          roots.push(o);
        }
      }

      const seen = new Set<string>();
      const make = (o: DbOkrObjective, rootHue: number, depth: number): OrgNode<TreeItem> => {
        // protect against cycles
        if (seen.has(o.id)) {
          return {
            id: `o:${o.id}`,
            data: {
              kind: "objective",
              title: o.title,
              subtitle: `${objectiveTypeLabel(o.level)} • ${objectiveLevelLabel(o.level)}`,
              pill: "—",
              tone: "objective",
              pick: { kind: "objective", id: `o:${o.id}`, objectiveId: o.id },
              activeKey: `o:${o.id}`,
              owner_user_id: o.owner_user_id,
              accent_hue: rootHue,
              accent_depth: depth,
            },
            children: [],
          };
        }
        seen.add(o.id);

        const krs = data?.krsByObjective?.[o.id] ?? [];
        const pct = averageObjectivePct(krs);

        const krChildren: OrgNode<TreeItem>[] = krs.slice(0, 5).map((kr) => ({
          id: `kr:${kr.id}`,
          data: {
            kind: "kr",
            title: kr.title,
            subtitle: kr.kind === "METRIC" ? `${kr.current_value ?? "—"} → ${kr.target_value ?? "—"} ${kr.metric_unit ?? ""}` : "Entregável",
            pill: typeof krProgressPct(kr) === "number" ? `${krProgressPct(kr)}%` : "—",
            tone: "objective",
            pick: { kind: "objective", id: `o:${o.id}`, objectiveId: o.id },
            activeKey: `o:${o.id}`,
            owner_user_id: (kr as any).owner_user_id ?? o.owner_user_id,
            accent_hue: rootHue,
            accent_depth: depth + 1,
          },
          children: [],
        }));

        if (krs.length > 5) {
          krChildren.push({
            id: `kr-more:${o.id}`,
            data: {
              kind: "kr",
              title: `Ver todos os KRs (${krs.length})`,
              subtitle: "Abrir o objetivo",
              pill: "Abrir",
              tone: "objective",
              href: `/okr/objetivos/${o.id}`,
              owner_user_id: o.owner_user_id,
              accent_hue: rootHue,
              accent_depth: depth + 1,
            },
            children: [],
          });
        }

        const kids = (childrenByParent.get(o.id) ?? [])
          .slice()
          .sort((a, b) => a.title.localeCompare(b.title))
          .map((child) => make(child, rootHue, depth + 1));

        return {
          id: `o:${o.id}`,
          data: {
            kind: "objective",
            title: o.title,
            subtitle: `${objectiveTypeLabel(o.level)} • ${objectiveLevelLabel(o.level)}`,
            pill: typeof pct === "number" ? `${pct}%` : "—",
            tone: "objective",
            pick: { kind: "objective", id: `o:${o.id}`, objectiveId: o.id },
            activeKey: `o:${o.id}`,
            owner_user_id: o.owner_user_id,
            accent_hue: rootHue,
            accent_depth: depth,
          },
          children: [...kids, ...krChildren],
        };
      };

      return roots
        .slice()
        .sort((a, b) => a.title.localeCompare(b.title))
        .map((r) => make(r, hueFromId(r.id), 0));
    };

    const cycleNodes = (list: DbOkrCycle[]): OrgNode<TreeItem>[] => {
      return list.map((c) => {
        const objs = data?.objectivesByCycle?.[c.id] ?? [];
        const objectiveChildren = buildObjectiveForest(objs);

        return {
          id: `c:${c.id}`,
          data: {
            kind: "cycle",
            title: cycleLabel(c),
            subtitle: c.status,
            pill: String(objs.length),
            tone: "cycles",
            pick: { kind: "cycle", id: `c:${c.id}`, cycleId: c.id },
            activeKey: `c:${c.id}`,
          },
          children: objectiveChildren,
        };
      });
    };

    // Ordem pedida: Trimestral primeiro.
    const cyclesRoot: OrgNode<TreeItem> = {
      id: "cycles",
      data: {
        kind: "cycles",
        title: "OKRs (ciclos)",
        subtitle: "Trimestre → ano",
        pill: String(cycles.length),
        tone: "cycles",
        pick: { kind: "cycles", id: "cycles" },
        activeKey: "cycles",
      },
      children: [
        {
          id: "cycles-quarterly",
          data: {
            kind: "group",
            title: "Trimestral",
            subtitle: "Execução do trimestre",
            pill: String(cycleGroups.quarterly.length),
            tone: "cycles",
            pick: { kind: "cycles", id: "cycles" },
            activeKey: "cycles",
          },
          children: cycleNodes(cycleGroups.quarterly),
        },
        {
          id: "cycles-annual",
          data: {
            kind: "group",
            title: "Anual",
            subtitle: "Direção do ano",
            pill: String(cycleGroups.annual.length),
            tone: "cycles",
            pick: { kind: "cycles", id: "cycles" },
            activeKey: "cycles",
          },
          children: cycleNodes(cycleGroups.annual),
        },
      ],
    };

    return [fundamentalsNode, strategyNode, cyclesRoot];
  }, [cycleGroups.annual, cycleGroups.quarterly, cycles.length, fundamentals, qTree.data, strategy]);

  return (
    <div className="grid gap-4">
      <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Árvore conectada (1 página)</div>
            <div className="mt-1 text-sm text-muted-foreground">
              Estratégia → ciclos → objetivos. Quando Tier I/Tier II estão vinculados, eles aparecem no mesmo espectro de cor.
            </div>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
            <Network className="h-5 w-5" />
          </div>
        </div>
      </div>

      {qTree.isLoading ? (
        <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-5 text-sm text-muted-foreground">Montando a árvore…</div>
      ) : qTree.error ? (
        <div className="rounded-3xl border border-destructive/30 bg-white p-5 text-sm text-destructive">Não foi possível montar a árvore.</div>
      ) : (
        <OrgChartTreeCanvas
          roots={roots}
          renderNode={(n) => <TreeNodeCard item={n.data} active={!!n.data.activeKey && n.data.activeKey === activeId} onPick={onPick} peopleById={peopleById} />}
          className="[&_>div.relative]:h-[74vh]"
        />
      )}
    </div>
  );
}

function FundamentalsPicker({
  cid,
  canEdit,
  fundamentals,
  onSaved,
}: {
  cid: string;
  canEdit: boolean;
  fundamentals: DbCompanyFundamentals | null;
  onSaved: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [saving, setSaving] = useState(false);

  const options = useMemo(
    () =>
      [
        { label: "Propósito", field: "purpose" as const },
        { label: "Visão", field: "vision" as const },
        { label: "Missão", field: "mission" as const },
        { label: "Valores", field: "values" as const },
        { label: "Cultura", field: "culture" as const },
      ] as const,
    [],
  );

  const [field, setField] = useState<(typeof options)[number]["field"]>("purpose");

  const describedFields = field === "values" || field === "culture";
  const [text, setText] = useState("");
  const [described, setDescribed] = useState<DescribedItem[]>([]);

  useEffect(() => {
    const raw = String((fundamentals as any)?.[field] ?? "");
    setText(raw);
    setDescribed(parseDescribedItems(raw));
    setSaving(false);
  }, [field, fundamentals?.updated_at]);

  const selectedLabel = options.find((o) => o.field === field)?.label ?? "Fundamento";

  return (
    <div className="grid gap-4">
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Fundamentos</div>
            <div className="mt-1 text-sm text-muted-foreground">Escolha o fundamento e edite (texto ou itens com descrição).</div>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
            <Route className="h-5 w-5" />
          </div>
        </div>

        <Separator className="my-4" />

        <div className="grid gap-2">
          <Label>Fundamento</Label>
          <Select value={field} onValueChange={(v) => setField(v as any)}>
            <SelectTrigger className="h-11 rounded-2xl bg-white">
              <SelectValue placeholder="Selecione…" />
            </SelectTrigger>
            <SelectContent className="rounded-2xl">
              {options.map((o) => (
                <SelectItem key={o.field} value={o.field}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </Card>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{selectedLabel}</div>
            <div className="mt-1 text-sm text-muted-foreground">{describedFields ? "Itens cadastrados" : "Texto"}</div>
          </div>
        </div>

        <Separator className="my-4" />

        {describedFields ? (
          <DescribedItemsEditor
            label={selectedLabel}
            hint={field === "values" ? "Valores com nome + descritivo." : "Cultura com nome + descritivo."}
            items={described}
            onChange={setDescribed}
            canEdit={canEdit}
            saving={saving}
            addLabel={field === "values" ? "Adicionar valor" : "Adicionar item"}
          />
        ) : (
          <div className="grid gap-3">
            <Label className="text-sm">Texto</Label>
            <Textarea
              className="min-h-[180px] rounded-2xl"
              value={text}
              disabled={!canEdit || saving}
              onChange={(e) => setText(e.target.value)}
              placeholder={`Escreva ${selectedLabel.toLowerCase()}…`}
            />
          </div>
        )}

        {canEdit ? (
          <div className="mt-4 flex justify-end">
            <Button
              className="h-11 rounded-2xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={saving}
              onClick={async () => {
                setSaving(true);
                try {
                  const patch: Partial<DbCompanyFundamentals> =
                    describedFields
                      ? ({ [field]: serializeDescribedItems(described) || null } as any)
                      : ({ [field]: text.trim() || null } as any);

                  await upsertCompanyFundamentals(cid, patch);
                  toast({ title: "Fundamento salvo" });
                  await onSaved();
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
      </Card>
    </div>
  );
}

function StrategyPicker({
  cid,
  canEdit,
  strategy,
  onSaved,
}: {
  cid: string;
  canEdit: boolean;
  strategy: DbStrategyObjective[];
  onSaved: () => Promise<void>;
}) {
  const [soId, setSoId] = useState<string>(strategy[0]?.id ?? "");

  useEffect(() => {
    if (!strategy.length) {
      setSoId("");
      return;
    }
    setSoId((prev) => (strategy.some((s) => s.id === prev) ? prev : strategy[0].id));
  }, [strategy]);

  const so = strategy.find((s) => s.id === soId) ?? null;

  return (
    <div className="grid gap-4">
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Objetivos de longo prazo</div>
            <div className="mt-1 text-sm text-muted-foreground">Selecione um objetivo para visualizar/editar.</div>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
            <Flag className="h-5 w-5" />
          </div>
        </div>

        <Separator className="my-4" />

        {strategy.length ? (
          <div className="grid gap-2">
            <Label>Objetivo</Label>
            <Select value={soId} onValueChange={setSoId}>
              <SelectTrigger className="h-11 rounded-2xl bg-white">
                <SelectValue placeholder="Selecione…" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                {strategy.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Nenhum objetivo de longo prazo ainda.</div>
        )}
      </Card>

      {so ? (
        <StrategyObjectiveEditor
          canEdit={canEdit}
          so={so}
          onSaved={async () => {
            await onSaved();
          }}
        />
      ) : null}
    </div>
  );
}

function CyclesPicker({
  cid,
  cycles,
  onPickObjective,
}: {
  cid: string;
  cycles: DbOkrCycle[];
  onPickObjective: (id: string) => void;
}) {
  const cycleOptions = useMemo(() => {
    const quarterly = cycles.filter((c) => c.type === "QUARTERLY").sort((a, b) => (b.year - a.year) || ((b.quarter ?? 0) - (a.quarter ?? 0)));
    const annual = cycles.filter((c) => c.type === "ANNUAL").sort((a, b) => b.year - a.year);
    return [...quarterly, ...annual];
  }, [cycles]);

  const [cycleId, setCycleId] = useState<string>(cycleOptions[0]?.id ?? "");

  useEffect(() => {
    setCycleId((prev) => (cycleOptions.some((c) => c.id === prev) ? prev : cycleOptions[0]?.id ?? ""));
  }, [cycleOptions]);

  const selected = cycleOptions.find((c) => c.id === cycleId) ?? null;

  const qObjectives = useQuery({
    queryKey: ["okr-map-cycle-objectives", cid, cycleId],
    enabled: !!cycleId,
    queryFn: () => listOkrObjectives(cid, cycleId),
    staleTime: 20_000,
  });

  return (
    <div className="grid gap-4">
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Ciclos</div>
            <div className="mt-1 text-sm text-muted-foreground">Selecione um ciclo e clique em um objetivo para abrir detalhes.</div>
          </div>
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
            <Layers className="h-5 w-5" />
          </div>
        </div>

        <Separator className="my-4" />

        {cycleOptions.length ? (
          <div className="grid gap-2">
            <Label>Ciclo</Label>
            <Select value={cycleId} onValueChange={setCycleId}>
              <SelectTrigger className="h-11 rounded-2xl bg-white">
                <SelectValue placeholder="Selecione…" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                {cycleOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {cycleLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Nenhum ciclo ainda.</div>
        )}

        {selected ? (
          <div className="mt-3 text-xs text-muted-foreground">
            {selected.type === "QUARTERLY" ? "Trimestral" : "Anual"} • {selected.status}
          </div>
        ) : null}
      </Card>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Objetivos do ciclo</div>
        <div className="mt-1 text-sm text-muted-foreground">Selecione para editar e vincular.</div>

        <Separator className="my-4" />

        {qObjectives.isLoading ? (
          <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Carregando objetivos…</div>
        ) : (qObjectives.data ?? []).length ? (
          <div className="grid gap-2">
            {(qObjectives.data ?? []).map((o) => (
              <button
                key={o.id}
                type="button"
                className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] px-4 py-3 text-left hover:bg-[color:var(--sinaxys-tint)]/35"
                onClick={() => onPickObjective(o.id)}
              >
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{o.title}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{objectiveTypeLabel(o.level)} • {objectiveLevelLabel(o.level)}</div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Sem objetivos nesse ciclo.</div>
        )}

        <div className="mt-4">
          <Button asChild variant="outline" className="h-11 rounded-2xl bg-white">
            <Link to="/okr/ciclos">Gerenciar ciclos</Link>
          </Button>
        </div>
      </Card>
    </div>
  );
}

export function OkrMapExplorer({ companyId }: { companyId: string }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const canEdit = user?.role === "ADMIN" || user?.role === "HEAD" || user?.role === "MASTERADMIN";

  const qFundamentals = useQuery({
    queryKey: ["okr-fundamentals", companyId],
    queryFn: () => getCompanyFundamentals(companyId),
  });

  const qStrategy = useQuery({
    queryKey: ["okr-strategy", companyId],
    queryFn: () => listStrategyObjectives(companyId),
  });

  const qCycles = useQuery({
    queryKey: ["okr-cycles", companyId],
    queryFn: () => listOkrCycles(companyId),
  });

  const qPeople = useQuery({
    queryKey: ["profile_public", companyId],
    queryFn: () => listPublicProfilesByCompany(companyId),
    staleTime: 60_000,
  });

  const fundamentals = qFundamentals.data ?? null;
  const strategy = qStrategy.data ?? [];
  const cycles = qCycles.data ?? [];

  const peopleById = useMemo(() => {
    const m = new Map<string, DbProfilePublic>();
    for (const p of qPeople.data ?? []) m.set(p.id, p);
    return m;
  }, [qPeople.data]);

  const [selected, setSelected] = useState<Node>({ kind: "fundamentals", id: "fundamentals" });

  const objectiveById = useMemo(() => new Map<string, DbOkrObjective>(), []);
  const cycleById = useMemo(() => {
    const m = new Map<string, DbOkrCycle>();
    for (const c of cycles) m.set(c.id, c);
    return m;
  }, [cycles]);

  const isMobile = typeof window !== "undefined" ? window.matchMedia("(max-width: 1024px)").matches : false;
  const [sheetOpen, setSheetOpen] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [view, setView] = useState<"list" | "tree">("list");

  const pick = (n: Node) => {
    setSelected(n);
    if (isMobile) {
      setSheetOpen(true);
    } else if (view === "tree") {
      setDialogOpen(true);
    }
  };

  const onInvalidate = async () => {
    await Promise.all([
      qc.invalidateQueries({ queryKey: ["okr-fundamentals", companyId] }),
      qc.invalidateQueries({ queryKey: ["okr-strategy", companyId] }),
      qc.invalidateQueries({ queryKey: ["okr-cycles", companyId] }),
    ]);
  };

  return (
    <>
      <Tabs value={view} onValueChange={(v) => setView(v as any)} className="w-full">
        <TabsList className="w-full justify-start gap-1 overflow-x-auto rounded-2xl bg-[color:var(--sinaxys-tint)] p-1">
          <TabsTrigger value="list" className="shrink-0 rounded-xl data-[state=active]:bg-white">
            Lista
          </TabsTrigger>
          <TabsTrigger value="tree" className="shrink-0 rounded-xl data-[state=active]:bg-white">
            Árvore
          </TabsTrigger>
        </TabsList>

        <TabsContent value="list" className="mt-5">
          <div className="grid gap-6 lg:h-[calc(100vh-220px)] lg:grid-cols-[420px_1fr] lg:overflow-hidden">
            <div className="grid gap-4 lg:overflow-hidden">
              <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Visão conectada</div>
                    <div className="mt-1 text-sm text-muted-foreground">Selecione na esquerda. Edite à direita (painel fixo).</div>
                  </div>
                  <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                    <ListTree className="h-5 w-5" />
                  </div>
                </div>
              </div>

              <ScrollArea className="lg:h-[calc(100vh-320px)]">
                <div className="grid gap-4 pr-3">
                  <ListView fundamentals={fundamentals} strategy={strategy} cycles={cycles} onPick={(n) => pick(n)} />

                  {(qFundamentals.isLoading || qStrategy.isLoading || qCycles.isLoading) && (
                    <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-5 text-sm text-muted-foreground">Carregando dados…</div>
                  )}

                  {(qFundamentals.error || qStrategy.error || qCycles.error) && (
                    <div className="rounded-3xl border border-destructive/30 bg-white p-5 text-sm text-destructive">
                      Não foi possível carregar o mapa. {String((qFundamentals.error ?? qStrategy.error ?? qCycles.error) as any)}
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>

            {/* Desktop details (sticky) */}
            <div className="hidden lg:block lg:h-[calc(100vh-220px)]">
              <DetailsShell
                node={selected}
                cid={companyId}
                canEdit={!!canEdit}
                fundamentals={fundamentals}
                strategy={strategy}
                cycles={cycles}
                objectiveById={objectiveById}
                cycleById={cycleById}
                onInvalidate={onInvalidate}
                onSelect={pick}
              />
            </div>
          </div>
        </TabsContent>

        <TabsContent value="tree" className="mt-5">
          <OkrMapTreeCanvas
            cid={companyId}
            fundamentals={fundamentals}
            strategy={strategy}
            cycles={cycles}
            activeId={selected.id}
            onPick={(n) => pick(n)}
            objectiveById={objectiveById}
            peopleById={peopleById}
          />

          {/* Desktop dialog details for tree mode */}
          <div className="hidden lg:block">
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-hidden rounded-3xl p-0 sm:max-w-2xl">
                <DialogHeader className="border-b border-[color:var(--sinaxys-border)] p-5">
                  <DialogTitle className="text-[color:var(--sinaxys-ink)]">Detalhes</DialogTitle>
                </DialogHeader>
                <ScrollArea className="h-[calc(88vh-76px)] p-5">
                  <DetailsBody
                    node={selected}
                    cid={companyId}
                    canEdit={!!canEdit}
                    fundamentals={fundamentals}
                    strategy={strategy}
                    cycles={cycles}
                    objectiveById={objectiveById}
                    cycleById={cycleById}
                    onInvalidate={onInvalidate}
                    onSelect={pick}
                  />
                </ScrollArea>
              </DialogContent>
            </Dialog>
          </div>
        </TabsContent>
      </Tabs>

      {/* Mobile details sheet (list + tree) */}
      <div className="lg:hidden">
        <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
          <SheetContent side="bottom" className="h-[88vh] w-full rounded-t-3xl p-0">
            <SheetHeader className="border-b border-[color:var(--sinaxys-border)] p-5">
              <SheetTitle className="text-[color:var(--sinaxys-ink)]">Detalhes</SheetTitle>
            </SheetHeader>
            <ScrollArea className="h-[calc(88vh-76px)] p-5">
              <DetailsBody
                node={selected}
                cid={companyId}
                canEdit={!!canEdit}
                fundamentals={fundamentals}
                strategy={strategy}
                cycles={cycles}
                objectiveById={objectiveById}
                cycleById={cycleById}
                onInvalidate={onInvalidate}
                onSelect={pick}
              />
            </ScrollArea>
          </SheetContent>
        </Sheet>

        <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-5 text-sm text-muted-foreground">
          <div className="font-semibold text-[color:var(--sinaxys-ink)]">Dica</div>
          <div className="mt-1">Toque em um item para abrir os detalhes (e editar quando disponível).</div>
        </div>
      </div>
    </>
  );
}