import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Eye, Flag, Layers, Plus, Target } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { OrgChartTreeCanvas, type OrgNode } from "@/components/OrgChartTreeCanvas";
import { KrEditDialog } from "@/components/okr/KrEditDialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import {
  createStrategyObjective,
  createOkrObjective,
  krProgressPct,
  listKeyResults,
  listOkrObjectives,
  type DbCompanyFundamentals,
  type DbOkrCycle,
  type DbOkrKeyResult,
  type DbOkrObjective,
  type DbStrategyObjective,
} from "@/lib/okrDb";
import type { DbProfilePublic } from "@/lib/profilePublicDb";
import type { DbDepartment } from "@/lib/departmentsDb";

function cycleLabelShort(c: DbOkrCycle) {
  if (c.type === "ANNUAL") return `Ano ${c.year}`;
  return `Q${c.quarter ?? "?"} ${c.year}`;
}

function pickDefaultAnnual(cycles: DbOkrCycle[]) {
  const now = new Date();
  const yy = now.getFullYear();
  const annual = cycles.filter((c) => c.type === "ANNUAL");
  const activeCur = annual.find((c) => c.year === yy && c.status === "ACTIVE");
  if (activeCur) return activeCur.id;
  const cur = annual.find((c) => c.year === yy);
  if (cur) return cur.id;
  const latest = [...annual].sort((a, b) => b.year - a.year)[0];
  return latest?.id ?? "";
}

function pickDefaultQuarter(cycles: DbOkrCycle[]) {
  const now = new Date();
  const yy = now.getFullYear();
  const q = Math.floor(now.getMonth() / 3) + 1;
  const quarterly = cycles.filter((c) => c.type === "QUARTERLY");
  const activeCur = quarterly.find((c) => c.year === yy && c.quarter === q && c.status === "ACTIVE");
  if (activeCur) return activeCur.id;
  const cur = quarterly.find((c) => c.year === yy && c.quarter === q);
  if (cur) return cur.id;
  const latest = [...quarterly].sort((a, b) => (b.year - a.year) || ((b.quarter ?? 0) - (a.quarter ?? 0)))[0];
  return latest?.id ?? "";
}

function objectiveProgressPct(krs: DbOkrKeyResult[]) {
  const pcts = krs.map((k) => krProgressPct(k)).filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (!pcts.length) return null;
  return Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
}

type PlaceholderStrategy = {
  kind: "placeholderStrategy";
  horizon: 10 | 5 | 2;
};

type MapItem =
  | { kind: "vision" }
  | { kind: "strategyRoot" }
  | { kind: "strategyObjective"; so: DbStrategyObjective }
  | PlaceholderStrategy
  | { kind: "group"; title: string; subtitle?: string }
  | { kind: "objective"; objective: DbOkrObjective; cycle: DbOkrCycle | null; pct: number | null; ownerName: string }
  | { kind: "kr"; kr: DbOkrKeyResult; pct: number | null };

function node<T extends MapItem>(id: string, data: T, children: OrgNode<MapItem>[] = []): OrgNode<MapItem> {
  return { id, data, children };
}

export function OkrStrategyMapCanvas(props: {
  companyId: string;
  userId: string;
  fundamentals: DbCompanyFundamentals | null;
  strategy: DbStrategyObjective[];
  cycles: DbOkrCycle[];
  peopleById: Map<string, DbProfilePublic>;
  departmentsById: Map<string, DbDepartment>;
  canEdit: boolean;
  onOpenVision: () => void;
  onOpenStrategyObjective: (soId: string) => void;
  onOpenObjective: (objectiveId: string) => void;
}) {
  const {
    companyId,
    userId,
    fundamentals,
    strategy,
    cycles,
    peopleById,
    onOpenVision,
    onOpenStrategyObjective,
    onOpenObjective,
    canEdit,
  } = props;

  const { toast } = useToast();
  const qc = useQueryClient();

  const annualOptions = useMemo(() => [...cycles].filter((c) => c.type === "ANNUAL").sort((a, b) => b.year - a.year), [cycles]);
  const quarterOptions = useMemo(
    () => [...cycles].filter((c) => c.type === "QUARTERLY").sort((a, b) => (b.year - a.year) || ((b.quarter ?? 0) - (a.quarter ?? 0))),
    [cycles],
  );

  const [annualCycleId, setAnnualCycleId] = useState(() => pickDefaultAnnual(cycles));
  const [quarterCycleId, setQuarterCycleId] = useState(() => pickDefaultQuarter(cycles));

  useEffect(() => {
    setAnnualCycleId((prev) => (annualOptions.some((c) => c.id === prev) ? prev : pickDefaultAnnual(cycles)));
    setQuarterCycleId((prev) => (quarterOptions.some((c) => c.id === prev) ? prev : pickDefaultQuarter(cycles)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycles.length]);

  const qAnnualObjectives = useQuery({
    queryKey: ["okr-map-canvas-annual-objectives", companyId, annualCycleId],
    enabled: !!annualCycleId,
    queryFn: () => listOkrObjectives(companyId, annualCycleId),
    staleTime: 20_000,
  });

  const qQuarterObjectives = useQuery({
    queryKey: ["okr-map-canvas-quarter-objectives", companyId, quarterCycleId],
    enabled: !!quarterCycleId,
    queryFn: () => listOkrObjectives(companyId, quarterCycleId),
    staleTime: 20_000,
  });

  const annualObjectives = qAnnualObjectives.data ?? [];
  const quarterObjectives = qQuarterObjectives.data ?? [];

  const cycleById = useMemo(() => new Map(cycles.map((c) => [c.id, c] as const)), [cycles]);

  const objectiveIds = useMemo(() => {
    const ids = [...annualObjectives.map((o) => o.id), ...quarterObjectives.map((o) => o.id)];
    return Array.from(new Set(ids));
  }, [annualObjectives, quarterObjectives]);

  const qKrs = useQuery({
    queryKey: ["okr-map-canvas-krs", companyId, objectiveIds.join(",")],
    enabled: objectiveIds.length > 0,
    queryFn: async () => {
      const m = new Map<string, DbOkrKeyResult[]>();
      await Promise.all(
        objectiveIds.map(async (oid) => {
          const krs = await listKeyResults(oid);
          m.set(oid, krs);
        }),
      );
      return m;
    },
    staleTime: 20_000,
  });

  const krsByObjectiveId = qKrs.data ?? new Map<string, DbOkrKeyResult[]>();

  const quarterChildrenByAnnualId = useMemo(() => {
    const m = new Map<string, DbOkrObjective[]>();
    for (const o of quarterObjectives) {
      if (!o.parent_objective_id) continue;
      const arr = m.get(o.parent_objective_id) ?? [];
      arr.push(o);
      m.set(o.parent_objective_id, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
    return m;
  }, [quarterObjectives]);

  const annualByStrategyId = useMemo(() => {
    const m = new Map<string | null, DbOkrObjective[]>();
    for (const o of annualObjectives) {
      const k = o.strategy_objective_id ?? null;
      const arr = m.get(k) ?? [];
      arr.push(o);
      m.set(k, arr);
    }
    for (const arr of m.values()) arr.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
    return m;
  }, [annualObjectives]);

  const orphanQuarterObjectives = useMemo(() => {
    const annualIdSet = new Set(annualObjectives.map((o) => o.id));
    return quarterObjectives.filter((o) => !o.parent_objective_id || !annualIdSet.has(o.parent_objective_id));
  }, [annualObjectives, quarterObjectives]);

  const [krDialogOpen, setKrDialogOpen] = useState(false);
  const [editingKr, setEditingKr] = useState<DbOkrKeyResult | null>(null);

  const peopleOptions = useMemo(() => {
    return Array.from(peopleById.values())
      .filter((p) => p.active)
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [peopleById]);

  const [createOpen, setCreateOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createHorizon, setCreateHorizon] = useState<10 | 5 | 2>(10);
  const [createTitle, setCreateTitle] = useState("");
  const [createDesc, setCreateDesc] = useState("");
  const [createOwner, setCreateOwner] = useState<string | null>(null);
  const [createTargetYear, setCreateTargetYear] = useState("");

  const [createOkrOpen, setCreateOkrOpen] = useState(false);
  const [creatingOkr, setCreatingOkr] = useState(false);
  const [createOkrMode, setCreateOkrMode] = useState<"annualUnderStrategy" | "quarterUnderAnnual">("annualUnderStrategy");
  const [createOkrParentId, setCreateOkrParentId] = useState<string | null>(null);
  const [createOkrTitle, setCreateOkrTitle] = useState("");
  const [createOkrDesc, setCreateOkrDesc] = useState("");
  const [createOkrOwner, setCreateOkrOwner] = useState<string>(userId);

  const openCreateForHorizon = (h: 10 | 5 | 2) => {
    if (!canEdit) {
      toast({ title: "Sem permissão", description: "Você não tem permissão para criar objetivos." , variant: "destructive"});
      return;
    }
    setCreateHorizon(h);
    setCreateTitle("");
    setCreateDesc("");
    setCreateOwner(null);
    setCreateTargetYear(String(new Date().getFullYear() + h));
    setCreateOpen(true);
  };

  const openCreateOkr = (mode: "annualUnderStrategy" | "quarterUnderAnnual", parentId: string) => {
    if (!canEdit) {
      toast({ title: "Sem permissão", description: "Você não tem permissão para criar objetivos.", variant: "destructive" });
      return;
    }

    // Validate: annual cycle must be ANNUAL; quarter cycle must be QUARTERLY
    const annualCycle = cycleById.get(annualCycleId);
    const quarterCycle = cycleById.get(quarterCycleId);
    if (mode === "annualUnderStrategy" && annualCycle?.type !== "ANNUAL") {
      toast({ title: "Ciclo inválido", description: "Selecione um ciclo ANUAL acima para criar objetivos do ano.", variant: "destructive" });
      return;
    }
    if (mode === "quarterUnderAnnual" && quarterCycle?.type !== "QUARTERLY") {
      toast({ title: "Ciclo inválido", description: "Selecione um ciclo TRIMESTRAL acima para criar objetivos do trimestre.", variant: "destructive" });
      return;
    }

    setCreateOkrMode(mode);
    setCreateOkrParentId(parentId);
    setCreateOkrTitle("");
    setCreateOkrDesc("");
    setCreateOkrOwner(userId);
    setCreateOkrOpen(true);
  };

  const roots = useMemo(() => {
    const byParent = new Map<string | null, DbStrategyObjective[]>();
    for (const so of strategy) {
      const k = so.parent_strategy_objective_id ?? null;
      const arr = byParent.get(k) ?? [];
      arr.push(so);
      byParent.set(k, arr);
    }
    for (const arr of byParent.values()) arr.sort((a, b) => (a.order_index - b.order_index) || a.title.localeCompare(b.title, "pt-BR"));

    const makeObjectiveNode = (o: DbOkrObjective): OrgNode<MapItem> => {
      const krs = krsByObjectiveId.get(o.id) ?? [];
      const pct = objectiveProgressPct(krs);
      const ownerName = peopleById.get(o.owner_user_id)?.name ?? "Responsável";
      const cycle = cycleById.get(o.cycle_id) ?? null;

      const krChildren: OrgNode<MapItem>[] = krs.map((kr) => {
        const kpct = krProgressPct(kr);
        return node(`kr:${kr.id}`, { kind: "kr", kr, pct: typeof kpct === "number" ? kpct : null });
      });

      const quarterChildren = (quarterChildrenByAnnualId.get(o.id) ?? []).map(makeObjectiveNode);

      return node(
        `o:${o.id}`,
        { kind: "objective", objective: o, cycle, pct, ownerName },
        [...quarterChildren, ...krChildren],
      );
    };

    const seen = new Set<string>();
    const makeStrategyNode = (so: DbStrategyObjective): OrgNode<MapItem> => {
      if (seen.has(so.id)) return node(`so:${so.id}`, { kind: "strategyObjective", so });
      seen.add(so.id);

      const childSos = (byParent.get(so.id) ?? []).map(makeStrategyNode);
      const annualKids = (annualByStrategyId.get(so.id) ?? []).map(makeObjectiveNode);

      return node(`so:${so.id}`, { kind: "strategyObjective", so }, [...childSos, ...annualKids]);
    };

    const topStrategy = (byParent.get(null) ?? []).map(makeStrategyNode);

    const placeholders: OrgNode<MapItem>[] = [];
    const has10 = strategy.some((s) => s.horizon_years === 10);
    const has5 = strategy.some((s) => s.horizon_years === 5);
    const has2 = strategy.some((s) => s.horizon_years === 2);
    if (!has10) placeholders.push(node("ph:10", { kind: "placeholderStrategy", horizon: 10 }));
    if (!has5) placeholders.push(node("ph:5", { kind: "placeholderStrategy", horizon: 5 }));
    if (!has2) placeholders.push(node("ph:2", { kind: "placeholderStrategy", horizon: 2 }));

    const unlinkedAnnual = (annualByStrategyId.get(null) ?? []).map(makeObjectiveNode);

    const groups: OrgNode<MapItem>[] = [];
    if (unlinkedAnnual.length) {
      groups.push(node("g:annual-unlinked", { kind: "group", title: "Ano (sem vínculo com longo prazo)", subtitle: `${unlinkedAnnual.length} objetivos` }, unlinkedAnnual));
    }
    if (orphanQuarterObjectives.length) {
      groups.push(node("g:quarter-orphans", { kind: "group", title: "Trimestre (sem vínculo com o ano)", subtitle: `${orphanQuarterObjectives.length} objetivos` }, orphanQuarterObjectives.map(makeObjectiveNode)));
    }

    const strategyRoot = node("strategy-root", { kind: "strategyRoot" }, [...placeholders, ...topStrategy, ...groups]);
    return [node("vision", { kind: "vision" }, [strategyRoot])];
  }, [annualByStrategyId, cycleById, krsByObjectiveId, orphanQuarterObjectives, peopleById, quarterChildrenByAnnualId, strategy]);

  const visionText = (fundamentals?.vision ?? "").trim();

  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Mapa Estratégico-Tático-Operacional</div>
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-2 lg:w-[520px]">
          <div className="grid gap-2">
            <Label className="text-xs">Ciclo do ano</Label>
            <Select value={annualCycleId} onValueChange={setAnnualCycleId}>
              <SelectTrigger className="h-11 rounded-2xl bg-white">
                <SelectValue placeholder="Selecione…" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                {annualOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {cycleLabelShort(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-2">
            <Label className="text-xs">Ciclo do trimestre</Label>
            <Select value={quarterCycleId} onValueChange={setQuarterCycleId}>
              <SelectTrigger className="h-11 rounded-2xl bg-white">
                <SelectValue placeholder="Selecione…" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                {quarterOptions.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {cycleLabelShort(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <Separator className="my-5" />

      <OrgChartTreeCanvas
        roots={roots}
        className={cn((qAnnualObjectives.isLoading || qQuarterObjectives.isLoading) && "opacity-70")}
        renderNode={(n) => {
          const d = n.data;

          if (d.kind === "vision") {
            return (
              <button
                type="button"
                onClick={onOpenVision}
                onPointerDown={(e) => e.stopPropagation()}
                className="group relative grid w-[320px] text-left outline-none"
                aria-label="Abrir visão"
              >
                <div className="rounded-3xl border border-[color:var(--map-fundamentals-border)] bg-[color:var(--map-fundamentals-bg)] p-5 shadow-sm transition group-hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--map-fundamentals-ink)]">
                        <Eye className="h-4 w-4" /> Visão
                      </div>
                      <div className="mt-2 text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/85">
                        {visionText ? (visionText.length > 120 ? visionText.slice(0, 120) + "…" : visionText) : "Sem visão cadastrada (clique para editar)"}
                      </div>
                    </div>
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/70 text-[color:var(--map-fundamentals-ink)] ring-1 ring-[color:var(--map-fundamentals-border)]">
                      <Flag className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </button>
            );
          }

          if (d.kind === "strategyRoot") {
            return (
              <div className="w-[300px] rounded-3xl border border-[color:var(--map-strategy-border)] bg-[color:var(--map-strategy-bg)] p-4 text-left shadow-sm">
                <div className="inline-flex items-center gap-2 text-sm font-semibold text-[color:var(--map-strategy-ink)]">
                  <Layers className="h-4 w-4" /> Longo prazo
                </div>
              </div>
            );
          }

          if (d.kind === "placeholderStrategy") {
            const label = d.horizon === 10 ? "Criar objetivo (10 anos)" : d.horizon === 5 ? "Criar objetivo (5 anos)" : "Criar objetivo (2 anos)";
            return (
              <button
                type="button"
                onClick={() => openCreateForHorizon(d.horizon)}
                onPointerDown={(e) => e.stopPropagation()}
                className="group relative grid w-[300px] text-left outline-none"
                aria-label={label}
                title={label}
              >
                <div className="rounded-3xl border border-dashed border-[color:var(--map-strategy-border)] bg-[color:var(--map-strategy-bg)]/40 p-4 shadow-sm transition group-hover:bg-[color:var(--map-strategy-bg)]/55 group-hover:shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-semibold text-[color:var(--map-strategy-ink)]">{label}</div>
                      <div className="mt-1 text-xs text-[color:var(--sinaxys-ink)]/70">Não encontramos nenhum objetivo nesse horizonte.</div>
                    </div>
                    <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white/70 text-[color:var(--map-strategy-ink)] ring-1 ring-[color:var(--map-strategy-border)]">
                      <Plus className="h-4 w-4" />
                    </div>
                  </div>
                </div>
              </button>
            );
          }

          if (d.kind === "strategyObjective") {
            return (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => onOpenStrategyObjective(d.so.id)}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="group relative grid w-[300px] text-left outline-none"
                  aria-label={`Abrir objetivo de longo prazo: ${d.so.title}`}
                  title={d.so.title}
                >
                  <div className="rounded-3xl border border-[color:var(--map-strategy-border)] bg-white p-4 shadow-sm transition group-hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)] line-clamp-2">{d.so.title}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge className="rounded-full bg-[color:var(--map-strategy-bg)] text-[color:var(--map-strategy-ink)] ring-1 ring-[color:var(--map-strategy-border)] hover:bg-[color:var(--map-strategy-bg)]">
                            {d.so.horizon_years} anos
                          </Badge>
                          <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)] hover:bg-white">
                            {d.so.target_year ?? new Date().getFullYear() + d.so.horizon_years}
                          </Badge>
                          {d.so.linked_fundamental ? (
                            <Badge className="rounded-full bg-[color:var(--map-fundamentals-bg)] text-[color:var(--map-fundamentals-ink)] ring-1 ring-[color:var(--map-fundamentals-border)] hover:bg-[color:var(--map-fundamentals-bg)]">
                              {d.so.linked_fundamental === "VISION" ? "Visão" : "Fundamento"}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[color:var(--map-strategy-bg)] text-[color:var(--map-strategy-ink)] ring-1 ring-[color:var(--map-strategy-border)]">
                        <Flag className="h-4 w-4" />
                      </div>
                    </div>
                  </div>
                </button>

                {canEdit ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openCreateOkr("annualUnderStrategy", d.so.id);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="absolute -right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-white text-[color:var(--sinaxys-primary)] shadow-sm ring-1 ring-[color:var(--map-strategy-border)] transition hover:bg-[color:var(--sinaxys-bg)]"
                    title="Criar objetivo do ano abaixo"
                    aria-label="Criar objetivo do ano abaixo"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            );
          }

          if (d.kind === "group") {
            return (
              <div className="w-[300px] rounded-3xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4 text-left">
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{d.title}</div>
                {d.subtitle ? <div className="mt-1 text-xs text-muted-foreground">{d.subtitle}</div> : null}
              </div>
            );
          }

          if (d.kind === "objective") {
            const cycle = d.cycle;
            const cycleTag = cycle ? cycleLabelShort(cycle) : "Ciclo";
            const pct = d.pct;
            const canCreateBelow = canEdit && cycle?.type === "ANNUAL";

            return (
              <div className="relative">
                <button
                  type="button"
                  onClick={() => onOpenObjective(d.objective.id)}
                  onPointerDown={(e) => e.stopPropagation()}
                  className="group relative grid w-[320px] text-left outline-none"
                  aria-label={`Abrir objetivo: ${d.objective.title}`}
                  title={d.objective.title}
                >
                  <div className="rounded-3xl border border-[color:var(--map-objectives-border)] bg-white p-5 shadow-sm transition group-hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)] line-clamp-2">{d.objective.title}</div>
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                          <Badge className="rounded-full bg-[color:var(--map-cycles-bg)] text-[color:var(--map-cycles-ink)] ring-1 ring-[color:var(--map-cycles-border)] hover:bg-[color:var(--map-cycles-bg)]">
                            {cycleTag}
                          </Badge>
                          <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)] hover:bg-white">
                            {d.ownerName}
                          </Badge>
                          {typeof pct === "number" ? (
                            <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">{pct}%</Badge>
                          ) : null}
                        </div>
                        {typeof pct === "number" ? (
                          <Progress value={pct} className="mt-3 h-2 rounded-full bg-[color:var(--sinaxys-tint)]" />
                        ) : null}
                      </div>
                      <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[color:var(--map-objectives-bg)] text-[color:var(--map-objectives-ink)] ring-1 ring-[color:var(--map-objectives-border)]">
                        {cycle?.type === "ANNUAL" ? <CalendarClock className="h-4 w-4" /> : <Layers className="h-4 w-4" />}
                      </div>
                    </div>
                  </div>
                </button>

                {canCreateBelow ? (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      openCreateOkr("quarterUnderAnnual", d.objective.id);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="absolute -right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-white text-[color:var(--sinaxys-primary)] shadow-sm ring-1 ring-[color:var(--map-objectives-border)] transition hover:bg-[color:var(--sinaxys-bg)]"
                    title="Criar objetivo do trimestre abaixo"
                    aria-label="Criar objetivo do trimestre abaixo"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                ) : null}
              </div>
            );
          }

          const pct = d.pct;
          return (
            <button
              type="button"
              onClick={() => {
                setEditingKr(d.kr);
                setKrDialogOpen(true);
              }}
              onPointerDown={(e) => e.stopPropagation()}
              className="group relative grid w-[260px] text-left outline-none"
              aria-label={`Editar KR: ${d.kr.title}`}
              title={d.kr.title}
            >
              <div className="rounded-2xl border border-[color:var(--map-objectives-border)] bg-[color:var(--map-objectives-bg)]/25 p-3 shadow-sm transition group-hover:shadow-md">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-[color:var(--sinaxys-ink)] line-clamp-2">{d.kr.title}</div>
                    <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
                      <span className="inline-flex items-center gap-1">
                        <Target className="h-3.5 w-3.5" /> KR
                      </span>
                      <span>•</span>
                      <span>{d.kr.kind === "DELIVERABLE" ? "Entregável" : "Métrico"}</span>
                      {typeof pct === "number" ? (
                        <>
                          <span>•</span>
                          <span className="font-medium text-[color:var(--sinaxys-ink)]">{pct}%</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                  <div className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-white/80 text-[color:var(--map-objectives-ink)] ring-1 ring-[color:var(--map-objectives-border)]">
                    <Target className="h-4 w-4" />
                  </div>
                </div>
                {typeof pct === "number" ? (
                  <div className="mt-2">
                    <Progress value={pct} className="h-2 rounded-full bg-white/60" />
                  </div>
                ) : null}
              </div>
            </button>
          );
        }}
      />

      <Dialog open={createOpen} onOpenChange={(v) => !creating && setCreateOpen(v)}>
        <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Criar objetivo de longo prazo ({createHorizon} anos)</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Título</Label>
              <Input className="h-11 rounded-2xl" value={createTitle} onChange={(e) => setCreateTitle(e.target.value)} disabled={creating} />
            </div>

            <div className="grid gap-2">
              <Label>Para quando (ano)</Label>
              <Input
                type="number"
                inputMode="numeric"
                className="h-11 rounded-2xl"
                value={createTargetYear}
                onChange={(e) => setCreateTargetYear(e.target.value)}
                disabled={creating}
              />
            </div>

            <div className="grid gap-2">
              <Label>Responsável</Label>
              <Select value={createOwner ?? "__company__"} onValueChange={(v) => setCreateOwner(v === "__company__" ? null : v)} disabled={creating}>
                <SelectTrigger className="h-11 rounded-2xl bg-white">
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="__company__">Toda a empresa</SelectItem>
                  {peopleOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Descrição (opcional)</Label>
              <Textarea className="min-h-[110px] rounded-2xl" value={createDesc} onChange={(e) => setCreateDesc(e.target.value)} disabled={creating} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="h-11 rounded-2xl bg-white" onClick={() => setCreateOpen(false)} disabled={creating}>
              Cancelar
            </Button>
            <Button
              className="h-11 rounded-2xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={creating || createTitle.trim().length < 6}
              onClick={async () => {
                setCreating(true);
                try {
                  const nYear = createTargetYear.trim() ? Number(createTargetYear.trim()) : null;
                  const created = await createStrategyObjective({
                    company_id: companyId,
                    horizon_years: createHorizon,
                    target_year: Number.isFinite(nYear as any) ? (nYear as any) : null,
                    title: createTitle,
                    description: createDesc.trim() || null,
                    created_by_user_id: userId,
                    owner_user_id: createOwner,
                    // Strong default: if we create the first of this horizon, connect to Vision.
                    linked_fundamental: createHorizon === 10 ? "VISION" : null,
                  });

                  toast({ title: "Objetivo criado" });
                  await qc.invalidateQueries({ queryKey: ["okr-strategy", companyId] });
                  setCreateOpen(false);
                  onOpenStrategyObjective(created.id);
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
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={createOkrOpen} onOpenChange={(v) => !creatingOkr && setCreateOkrOpen(v)}>
        <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>
              {createOkrMode === "annualUnderStrategy" ? "Criar objetivo do ano" : "Criar objetivo do trimestre"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Título</Label>
              <Input className="h-11 rounded-2xl" value={createOkrTitle} onChange={(e) => setCreateOkrTitle(e.target.value)} disabled={creatingOkr} />
            </div>

            <div className="grid gap-2">
              <Label>Responsável</Label>
              <Select value={createOkrOwner} onValueChange={(v) => setCreateOkrOwner(v)} disabled={creatingOkr}>
                <SelectTrigger className="h-11 rounded-2xl bg-white">
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {peopleOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">Dica: escolha você mesmo para não ficar sem dono.</div>
            </div>

            <div className="grid gap-2">
              <Label>Descrição (opcional)</Label>
              <Textarea className="min-h-[110px] rounded-2xl" value={createOkrDesc} onChange={(e) => setCreateOkrDesc(e.target.value)} disabled={creatingOkr} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="h-11 rounded-2xl bg-white" onClick={() => setCreateOkrOpen(false)} disabled={creatingOkr}>
              Cancelar
            </Button>
            <Button
              className="h-11 rounded-2xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={creatingOkr || createOkrTitle.trim().length < 6 || !createOkrParentId}
              onClick={async () => {
                if (!createOkrParentId) return;
                const annualCycle = cycleById.get(annualCycleId);
                const quarterCycle = cycleById.get(quarterCycleId);
                setCreatingOkr(true);
                try {
                  const cycleId = createOkrMode === "annualUnderStrategy" ? annualCycleId : quarterCycleId;
                  const cycle = cycleById.get(cycleId);
                  if (!cycle) throw new Error("Ciclo inválido.");

                  const payload: Parameters<typeof createOkrObjective>[0] = {
                    company_id: companyId,
                    cycle_id: cycleId,
                    parent_objective_id: createOkrMode === "quarterUnderAnnual" ? createOkrParentId : null,
                    strategy_objective_id: createOkrMode === "annualUnderStrategy" ? createOkrParentId : null,
                    level: createOkrMode === "annualUnderStrategy" ? "COMPANY" : "DEPARTMENT",
                    department_id: null,
                    owner_user_id: createOkrOwner,
                    title: createOkrTitle,
                    description: createOkrDesc.trim() || null,
                    strategic_reason: null,
                    linked_fundamental: null,
                    linked_fundamental_text: null,
                    due_at: null,
                    estimated_value_brl: null,
                    estimated_effort_hours: null,
                    estimated_cost_brl: null,
                    estimated_roi_pct: null,
                    expected_profit_brl: null,
                    profit_thesis: null,
                    expected_revenue_at: null,
                    expected_attainment_pct: 80,
                  };

                  const created = await createOkrObjective(payload);

                  await qc.invalidateQueries({ queryKey: ["okr-map-canvas-annual-objectives", companyId, annualCycleId] });
                  await qc.invalidateQueries({ queryKey: ["okr-map-canvas-quarter-objectives", companyId, quarterCycleId] });
                  await qc.invalidateQueries({ queryKey: ["okr-map-canvas-krs", companyId] });

                  toast({ title: "Objetivo criado" });
                  setCreateOkrOpen(false);
                  onOpenObjective(created.id);
                } catch (e) {
                  toast({
                    title: "Não foi possível criar",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                } finally {
                  setCreatingOkr(false);
                }
              }}
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {editingKr ? (
        <KrEditDialog
          open={krDialogOpen}
          onOpenChange={(v) => {
            setKrDialogOpen(v);
            if (!v) setEditingKr(null);
          }}
          companyId={companyId}
          userId={userId}
          kr={editingKr}
        />
      ) : null}

      <Input className="sr-only" aria-hidden />
    </Card>
  );
}