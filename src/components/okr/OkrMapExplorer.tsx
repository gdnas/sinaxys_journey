import { useMemo, useState } from "react";
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
} from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import {
  getCompanyFundamentals,
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
import { objectiveLevelLabel, objectiveTypeBadgeClass, objectiveTypeLabel } from "@/lib/okrUi";
import { cn } from "@/lib/utils";

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
      strategic_north: "Norte estratégico",
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
}) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const qKrs = useQuery({
    queryKey: ["okr-krs", node.kind === "objective" ? node.objectiveId : null],
    enabled: node.kind === "objective",
    queryFn: () => listKeyResults((node as any).objectiveId),
  });

  const pct = useMemo(() => {
    if (node.kind !== "objective") return null;
    return averageObjectivePct(qKrs.data ?? []);
  }, [node.kind, qKrs.data]);

  return (
    <div className="grid gap-4">
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

      {node.kind === "objective" ? (
        <ObjectiveEditor
          canEdit={canEdit}
          objective={objectiveById.get(node.objectiveId) ?? null}
          pct={pct}
          krs={qKrs.data ?? []}
          loadingKrs={qKrs.isLoading}
          onSaved={async () => {
            await Promise.all([
              qc.invalidateQueries({ queryKey: ["okr-quarter-objectives", cid] }),
              qc.invalidateQueries({ queryKey: ["okr-objectives", cid] }),
              qc.invalidateQueries({ queryKey: ["okr-krs", node.objectiveId] }),
            ]);
            await onInvalidate();
          }}
        />
      ) : null}

      {(node.kind === "fundamentals" || node.kind === "strategy" || node.kind === "cycles" || node.kind === "root") && (
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
          <div className="text-sm text-muted-foreground">
            Selecione um item na árvore/lista para ver detalhes, editar e acompanhar andamento.
          </div>
        </Card>
      )}
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
}) {
  const title = useMemo(() => {
    if (node.kind === "fundamental") return nodeTitle(node);
    if (node.kind === "cycle") return cycleLabel(cycleById.get(node.cycleId)!);
    if (node.kind === "objective") return objectiveById.get(node.objectiveId)?.title ?? "Objetivo";
    if (node.kind === "strategyObjective") return strategy.find((s) => s.id === node.soId)?.title ?? "Objetivo longo prazo";
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
    { field: "strategic_north", icon: <Route className="h-4 w-4" /> },
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
            <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">
              Nenhum objetivo de longo prazo ainda.
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
              {cycleGroups.annual.map((c) => {
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
              })}
            </div>
          </div>

          <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-4">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trimestral</div>
            <div className="mt-2 grid gap-2">
              {cycleGroups.quarterly.slice(0, 8).map((c) => {
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
              })}

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
  const fundamentalsFields: Array<{ field: keyof DbCompanyFundamentals; label: string }> = [
    { field: "purpose", label: "Propósito" },
    { field: "vision", label: "Visão" },
    { field: "mission", label: "Missão" },
    { field: "values", label: "Valores" },
    { field: "culture", label: "Cultura" },
    { field: "strategic_north", label: "Norte estratégico" },
  ];

  const annual = cycles.filter((c) => c.type === "ANNUAL").sort((a, b) => b.year - a.year);
  const quarterly = cycles.filter((c) => c.type === "QUARTERLY").sort((a, b) => (b.year - a.year) || ((b.quarter ?? 0) - (a.quarter ?? 0)));

  return (
    <div className="grid gap-4">
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Fundamentos</div>
            <div className="mt-1 text-sm text-muted-foreground">Clique para abrir e editar rapidamente.</div>
          </div>
          <Route className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
        </div>
        <Separator className="my-4" />
        <div className="grid gap-2">
          {fundamentalsFields.map((f) => (
            <button
              key={f.field}
              type="button"
              className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] px-4 py-3 text-left hover:bg-[color:var(--sinaxys-tint)]/35"
              onClick={() => onPick({ kind: "fundamental", id: `fund:${f.field}` as any, field: f.field })}
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{f.label}</div>
                <div className="mt-1 truncate text-xs text-muted-foreground">
                  {String((fundamentals as any)?.[f.field] ?? "—")}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
        </div>
      </Card>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Objetivos de longo prazo</div>
            <div className="mt-1 text-sm text-muted-foreground">1–10 anos (clique para detalhes).</div>
          </div>
          <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
            {strategy.length}
          </Badge>
        </div>
        <Separator className="my-4" />
        <div className="grid gap-2">
          {strategy.map((so) => (
            <button
              key={so.id}
              type="button"
              className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] px-4 py-3 text-left hover:bg-[color:var(--sinaxys-tint)]/35"
              onClick={() => onPick({ kind: "strategyObjective", id: `so:${so.id}`, soId: so.id })}
            >
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{so.title}</div>
                <div className="mt-1 text-xs text-muted-foreground">{so.horizon_years} anos</div>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          ))}
          {!strategy.length ? (
            <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Nenhum objetivo ainda.</div>
          ) : null}
        </div>
      </Card>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Ciclos</div>
            <div className="mt-1 text-sm text-muted-foreground">Anual e trimestral (clique para abrir).</div>
          </div>
          <Layers className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
        </div>
        <Separator className="my-4" />

        <div className="grid gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Anual</div>
            <div className="mt-2 grid gap-2">
              {annual.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] px-4 py-3 text-left hover:bg-[color:var(--sinaxys-tint)]/35"
                  onClick={() => onPick({ kind: "cycle", id: `c:${c.id}`, cycleId: c.id })}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{cycleLabel(c)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{c.status}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trimestral</div>
            <div className="mt-2 grid gap-2">
              {quarterly.slice(0, 10).map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] px-4 py-3 text-left hover:bg-[color:var(--sinaxys-tint)]/35"
                  onClick={() => onPick({ kind: "cycle", id: `c:${c.id}`, cycleId: c.id })}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{cycleLabel(c)}</div>
                    <div className="mt-1 text-xs text-muted-foreground">{c.status}</div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
              {quarterly.length > 10 ? <div className="text-xs text-muted-foreground">Mostrando os 10 mais recentes.</div> : null}
            </div>
          </div>
        </div>
      </Card>
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
  const [value, setValue] = useState<string>(() => String((fundamentals as any)?.[field] ?? ""));
  const [saving, setSaving] = useState(false);

  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{nodeTitle({ kind: "fundamental", id: `fund:${field}` as any, field })}</div>
          <div className="mt-1 text-sm text-muted-foreground">Texto base (visível para todos no módulo OKR).</div>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
          <Route className="h-5 w-5" />
        </div>
      </div>

      <Separator className="my-4" />

      <div className="grid gap-2">
        <Label>Conteúdo</Label>
        <Textarea className="min-h-[140px] rounded-2xl" value={value} onChange={(e) => setValue(e.target.value)} disabled={!canEdit || saving} />
      </div>

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
                await upsertCompanyFundamentals(cid, { [field]: value } as any);
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
}: {
  canEdit: boolean;
  objective: DbOkrObjective | null;
  pct: number | null;
  krs: DbOkrKeyResult[];
  loadingKrs: boolean;
  onSaved: () => Promise<void>;
}) {
  const { toast } = useToast();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState(objective?.title ?? "");
  const [description, setDescription] = useState(objective?.description ?? "");
  const [reason, setReason] = useState(objective?.strategic_reason ?? "");

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
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-xl bg-white"
                onClick={() => setEditing((v) => !v)}
              >
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

  const fundamentals = qFundamentals.data ?? null;
  const strategy = qStrategy.data ?? [];
  const cycles = qCycles.data ?? [];

  const [expanded, setExpanded] = useState<Record<string, boolean>>({
    fundamentals: true,
    strategy: true,
    cycles: true,
  });

  const [selected, setSelected] = useState<Node>({ kind: "fundamentals", id: "fundamentals" });

  const objectiveById = useMemo(() => new Map<string, DbOkrObjective>(), []);
  const cycleById = useMemo(() => {
    const m = new Map<string, DbOkrCycle>();
    for (const c of cycles) m.set(c.id, c);
    return m;
  }, [cycles]);

  // Keep objectiveById warm when any cycle is expanded (only those objectives are loaded).
  useQuery({
    queryKey: ["okr-map-objectives-cache", companyId, Object.keys(expanded).filter((k) => k.startsWith("c:") && expanded[k]).join(",")],
    enabled: Object.keys(expanded).some((k) => k.startsWith("c:") && expanded[k]),
    queryFn: async () => {
      const cycleIds = Object.keys(expanded)
        .filter((k) => k.startsWith("c:") && expanded[k])
        .map((k) => k.slice(2));

      await Promise.all(
        cycleIds.map(async (cycleId) => {
          const objs = await listOkrObjectives(companyId, cycleId);
          for (const o of objs) objectiveById.set(o.id, o);
        }),
      );

      return true;
    },
  });

  const isMobile = typeof window !== "undefined" ? window.matchMedia("(max-width: 1024px)").matches : false;
  const [sheetOpen, setSheetOpen] = useState(false);

  const ctx: TreeCtx = {
    cid: companyId,
    activeId: selected.id,
    expanded,
    toggle(id) {
      setExpanded((prev) => ({ ...prev, [id]: !prev[id] }));
    },
    select(n) {
      setSelected(n);
      if (isMobile) setSheetOpen(true);
    },
    canEdit,
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
      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <div className="grid gap-4">
          <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Visão conectada</div>
                <div className="mt-1 text-sm text-muted-foreground">Fundamentos → longo prazo → ciclos → objetivos → KRs.</div>
              </div>
              <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                <ListTree className="h-5 w-5" />
              </div>
            </div>
          </div>

          <Tabs defaultValue="tree" className="w-full">
            <TabsList className="w-full justify-start gap-1 overflow-x-auto rounded-2xl bg-[color:var(--sinaxys-tint)] p-1">
              <TabsTrigger value="tree" className="shrink-0 rounded-xl data-[state=active]:bg-white">
                Árvore
              </TabsTrigger>
              <TabsTrigger value="list" className="shrink-0 rounded-xl data-[state=active]:bg-white">
                Lista
              </TabsTrigger>
            </TabsList>

            <TabsContent value="tree" className="mt-4">
              <Tree ctx={ctx} fundamentals={fundamentals} strategy={strategy} cycles={cycles} />
            </TabsContent>

            <TabsContent value="list" className="mt-4">
              <ListView fundamentals={fundamentals} strategy={strategy} cycles={cycles} onPick={(n) => ctx.select(n)} />
            </TabsContent>
          </Tabs>

          {(qFundamentals.isLoading || qStrategy.isLoading || qCycles.isLoading) && (
            <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-5 text-sm text-muted-foreground">Carregando dados…</div>
          )}

          {(qFundamentals.error || qStrategy.error || qCycles.error) && (
            <div className="rounded-3xl border border-destructive/30 bg-white p-5 text-sm text-destructive">
              Não foi possível carregar o mapa. {String((qFundamentals.error ?? qStrategy.error ?? qCycles.error) as any)}
            </div>
          )}
        </div>

        {/* Desktop details */}
        <div className="hidden lg:block">
          <div className="grid gap-4">
            <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-5">
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Detalhes</div>
              <div className="mt-1 text-sm text-muted-foreground">Clique em qualquer item para abrir um card e editar.</div>
            </div>

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
            />

            <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-5 text-sm text-muted-foreground">
              <div className="font-semibold text-[color:var(--sinaxys-ink)]">Nota</div>
              <div className="mt-1">
                Hoje o sistema não possui um vínculo formal entre objetivos de longo prazo e OKRs do ano. O mapa mostra tudo em sequência e permite
                navegar/editar. Se você quiser, a gente adiciona um campo de vínculo (bem simples) para ficar 100% "conectado" por dado.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile details sheet */}
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