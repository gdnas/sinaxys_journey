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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

import {
  createKeyResult,
  createOkrObjective,
  createStrategyObjective,
  krProgressPct,
  listKeyResults,
  listOkrObjectives,
  type DbCompanyFundamentals,
  type DbOkrCycle,
  type DbOkrKeyResult,
  type DbOkrObjective,
  type DbStrategyObjective,
  type KrConfidence,
  type KrKind,
} from "@/lib/okrDb";
import { listLinksByObjectiveIds } from "@/lib/okrAlignmentDb";
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
    departmentsById,
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

  const departmentOptions = useMemo(() => {
    return Array.from(departmentsById.values()).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [departmentsById]);

  const [annualCycleId, setAnnualCycleId] = useState(() => pickDefaultAnnual(cycles));
  const [quarterCycleId, setQuarterCycleId] = useState(() => pickDefaultQuarter(cycles));
  const [teamId, setTeamId] = useState<string>("ALL");

  useEffect(() => {
    setAnnualCycleId((prev) => (annualOptions.some((c) => c.id === prev) ? prev : pickDefaultAnnual(cycles)));
    setQuarterCycleId((prev) => (quarterOptions.some((c) => c.id === prev) ? prev : pickDefaultQuarter(cycles)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cycles.length]);

  useEffect(() => {
    if (teamId === "ALL") return;
    if (!departmentsById.has(teamId)) setTeamId("ALL");
  }, [departmentsById, teamId]);

  const filterActive = teamId !== "ALL";

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

  const allAnnualObjectives = qAnnualObjectives.data ?? [];
  const allQuarterObjectives = qQuarterObjectives.data ?? [];

  const allObjectivesById = useMemo(() => {
    const m = new Map<string, DbOkrObjective>();
    for (const o of allAnnualObjectives) m.set(o.id, o);
    for (const o of allQuarterObjectives) m.set(o.id, o);
    return m;
  }, [allAnnualObjectives, allQuarterObjectives]);

  const cycleById = useMemo(() => new Map(cycles.map((c) => [c.id, c] as const)), [cycles]);

  const allObjectiveIds = useMemo(() => {
    const ids = [...allAnnualObjectives.map((o) => o.id), ...allQuarterObjectives.map((o) => o.id)];
    return Array.from(new Set(ids));
  }, [allAnnualObjectives, allQuarterObjectives]);

  const qKrs = useQuery({
    queryKey: ["okr-map-canvas-krs", companyId, allObjectiveIds.join(",")],
    enabled: allObjectiveIds.length > 0,
    queryFn: async () => {
      const m = new Map<string, DbOkrKeyResult[]>();
      await Promise.all(
        allObjectiveIds.map(async (oid) => {
          const krs = await listKeyResults(oid);
          m.set(oid, krs);
        }),
      );
      return m;
    },
    staleTime: 20_000,
  });

  const krsByObjectiveId = qKrs.data ?? new Map<string, DbOkrKeyResult[]>();

  const qQuarterLinks = useQuery({
    queryKey: ["okr-map-canvas-quarter-kr-links", companyId, allQuarterObjectives.map((o) => o.id).join(",")],
    enabled: allQuarterObjectives.length > 0,
    queryFn: () => listLinksByObjectiveIds(allQuarterObjectives.map((o) => o.id)),
    staleTime: 20_000,
  });

  const quarterLinks = qQuarterLinks.data ?? [];

  const annualKrToAnnualObjectiveId = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of allAnnualObjectives) {
      const krs = krsByObjectiveId.get(o.id) ?? [];
      for (const kr of krs) m.set(kr.id, o.id);
    }
    return m;
  }, [allAnnualObjectives, krsByObjectiveId]);

  const { annualObjectives, quarterObjectives } = useMemo(() => {
    if (!filterActive) return { annualObjectives: allAnnualObjectives, quarterObjectives: allQuarterObjectives };

    const deptId = teamId;

    const include = new Set<string>();

    // Seeds: objectives that belong to the selected team
    for (const o of allAnnualObjectives) {
      if (o.department_id === deptId) include.add(o.id);
    }
    for (const o of allQuarterObjectives) {
      if (o.department_id === deptId) include.add(o.id);
    }

    const quarterIdSet = new Set(allQuarterObjectives.map((o) => o.id));

    // Add ancestry so we keep the "path" up to the team objectives.
    // - Parent chain is kept ONLY within the same cycle (avoid using cross-cycle parent links for annual alignment).
    // - Quarter objectives can pull in the annual objective via KR alignment (annual KR -> quarterly objective).
    const queue = Array.from(include);
    while (queue.length) {
      const id = queue.pop()!;
      const o = allObjectivesById.get(id);
      if (!o) continue;

      const parentId = o.parent_objective_id ?? null;
      if (parentId) {
        const parent = allObjectivesById.get(parentId);
        if (parent && parent.cycle_id === o.cycle_id && !include.has(parentId)) {
          include.add(parentId);
          queue.push(parentId);
        }
      }

      // If this is a quarterly objective, include the annual objective that owns any linked annual KR.
      if (quarterIdSet.has(id)) {
        for (const l of quarterLinks) {
          if (l.objective_id !== id) continue;
          const annualObjectiveId = annualKrToAnnualObjectiveId.get(l.key_result_id) ?? null;
          if (annualObjectiveId && !include.has(annualObjectiveId)) {
            include.add(annualObjectiveId);
            queue.push(annualObjectiveId);
          }
        }
      }
    }

    return {
      annualObjectives: allAnnualObjectives.filter((o) => include.has(o.id)),
      quarterObjectives: allQuarterObjectives.filter((o) => include.has(o.id)),
    };
  }, [
    allAnnualObjectives,
    allObjectivesById,
    allQuarterObjectives,
    annualKrToAnnualObjectiveId,
    filterActive,
    quarterLinks,
    teamId,
  ]);

  const quarterChildrenByAnnualKrId = useMemo(() => {
    const quarterById = new Map(quarterObjectives.map((o) => [o.id, o] as const));

    const m = new Map<string, DbOkrObjective[]>();
    for (const l of quarterLinks) {
      const q = quarterById.get(l.objective_id);
      if (!q) continue;

      // Only links to annual KRs are used to place quarter objectives under the year.
      if (!annualKrToAnnualObjectiveId.has(l.key_result_id)) continue;

      const arr = m.get(l.key_result_id) ?? [];
      if (!arr.some((x) => x.id === q.id)) arr.push(q);
      m.set(l.key_result_id, arr);
    }

    for (const arr of m.values()) arr.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
    return m;
  }, [annualKrToAnnualObjectiveId, quarterLinks, quarterObjectives]);

  const orphanQuarterObjectives = useMemo(() => {
    const linked = new Set<string>();
    for (const arr of quarterChildrenByAnnualKrId.values()) for (const o of arr) linked.add(o.id);
    return quarterObjectives.filter((o) => !linked.has(o.id));
  }, [quarterChildrenByAnnualKrId, quarterObjectives]);

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

  const [createKrOpen, setCreateKrOpen] = useState(false);
  const [creatingKr, setCreatingKr] = useState(false);
  const [createKrObjectiveId, setCreateKrObjectiveId] = useState<string | null>(null);
  const [createKrKind, setCreateKrKind] = useState<KrKind>("METRIC");
  const [createKrTitle, setCreateKrTitle] = useState("");
  const [createKrUnit, setCreateKrUnit] = useState("");
  const [createKrStart, setCreateKrStart] = useState("");
  const [createKrTarget, setCreateKrTarget] = useState("");
  const [createKrDue, setCreateKrDue] = useState("");
  const [createKrOwner, setCreateKrOwner] = useState<string | null>(null);

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

  const openCreateKr = (objectiveId: string) => {
    if (!canEdit) {
      toast({ title: "Sem permissão", description: "Você não tem permissão para criar KRs.", variant: "destructive" });
      return;
    }
    setCreateKrObjectiveId(objectiveId);
    setCreateKrKind("METRIC");
    setCreateKrTitle("");
    setCreateKrUnit("");
    setCreateKrStart("");
    setCreateKrTarget("");
    setCreateKrDue("");
    setCreateKrOwner(null);
    setCreateKrOpen(true);
  };

  const roots = useMemo(() => {
    const byParent = new Map<string | null, DbStrategyObjective[]>();
    const parentById = new Map<string, string | null>();

    for (const so of strategy) {
      const k = so.parent_strategy_objective_id ?? null;
      const arr = byParent.get(k) ?? [];
      arr.push(so);
      byParent.set(k, arr);
      parentById.set(so.id, k);
    }
    for (const arr of byParent.values()) arr.sort((a, b) => (a.order_index - b.order_index) || a.title.localeCompare(b.title, "pt-BR"));

    const requiredStrategyIds = (() => {
      if (!filterActive) return null;
      const s = new Set<string>();
      const seeds = [
        ...annualObjectives.map((o) => o.strategy_objective_id).filter(Boolean),
        ...quarterObjectives.map((o) => o.strategy_objective_id).filter(Boolean),
      ] as string[];

      const stack = [...seeds];
      while (stack.length) {
        const id = stack.pop()!;
        if (s.has(id)) continue;
        s.add(id);
        const p = parentById.get(id) ?? null;
        if (p) stack.push(p);
      }
      return s;
    })();

    const makeQuarterObjectiveNode = (o: DbOkrObjective): OrgNode<MapItem> => {
      const krs = krsByObjectiveId.get(o.id) ?? [];
      const pct = objectiveProgressPct(krs);
      const ownerName = peopleById.get(o.owner_user_id)?.name ?? "Responsável";
      const cycle = cycleById.get(o.cycle_id) ?? null;

      const krChildren: OrgNode<MapItem>[] = krs.map((kr) => {
        const kpct = krProgressPct(kr);
        return node(`kr:${kr.id}`, { kind: "kr", kr, pct: typeof kpct === "number" ? kpct : null });
      });

      return node(`o:${o.id}`, { kind: "objective", objective: o, cycle, pct, ownerName }, krChildren);
    };

    const makeAnnualObjectiveNode = (o: DbOkrObjective): OrgNode<MapItem> => {
      const krs = krsByObjectiveId.get(o.id) ?? [];
      const pct = objectiveProgressPct(krs);
      const ownerName = peopleById.get(o.owner_user_id)?.name ?? "Responsável";
      const cycle = cycleById.get(o.cycle_id) ?? null;

      const krChildren: OrgNode<MapItem>[] = krs.map((kr) => {
        const kpct = krProgressPct(kr);
        const quarterKids = (quarterChildrenByAnnualKrId.get(kr.id) ?? []).map(makeQuarterObjectiveNode);
        return node(`kr:${kr.id}`, { kind: "kr", kr, pct: typeof kpct === "number" ? kpct : null }, quarterKids);
      });

      return node(`o:${o.id}`, { kind: "objective", objective: o, cycle, pct, ownerName }, krChildren);
    };

    const seen = new Set<string>();

    const makeStrategyNodeMaybe = (so: DbStrategyObjective): OrgNode<MapItem> | null => {
      if (seen.has(so.id)) return node(`so:${so.id}`, { kind: "strategyObjective", so });
      seen.add(so.id);

      const childSos = (byParent.get(so.id) ?? [])
        .map(makeStrategyNodeMaybe)
        .filter((x): x is OrgNode<MapItem> => !!x);

      const annualKids = (annualByStrategyId.get(so.id) ?? []).map(makeAnnualObjectiveNode);

      if (requiredStrategyIds) {
        const hasContent = requiredStrategyIds.has(so.id) || childSos.length > 0 || annualKids.length > 0;
        if (!hasContent) return null;
      }

      return node(`so:${so.id}`, { kind: "strategyObjective", so }, [...childSos, ...annualKids]);
    };

    const topStrategy = (byParent.get(null) ?? [])
      .map(makeStrategyNodeMaybe)
      .filter((x): x is OrgNode<MapItem> => !!x);

    const placeholders: OrgNode<MapItem>[] = [];
    if (!filterActive) {
      const has10 = strategy.some((s) => s.horizon_years === 10);
      const has5 = strategy.some((s) => s.horizon_years === 5);
      const has2 = strategy.some((s) => s.horizon_years === 2);
      if (!has10) placeholders.push(node("ph:10", { kind: "placeholderStrategy", horizon: 10 }));
      if (!has5) placeholders.push(node("ph:5", { kind: "placeholderStrategy", horizon: 5 }));
      if (!has2) placeholders.push(node("ph:2", { kind: "placeholderStrategy", horizon: 2 }));
    }

    const unlinkedAnnual = (annualByStrategyId.get(null) ?? []).map(makeAnnualObjectiveNode);

    const groups: OrgNode<MapItem>[] = [];
    if (unlinkedAnnual.length) {
      groups.push(node("g:annual-unlinked", { kind: "group", title: "Ano (sem vínculo com longo prazo)", subtitle: `${unlinkedAnnual.length} objetivos` }, unlinkedAnnual));
    }
    if (orphanQuarterObjectives.length) {
      groups.push(
        node(
          "g:quarter-orphans",
          { kind: "group", title: "Trimestre (sem vínculo com o ano)", subtitle: `${orphanQuarterObjectives.length} objetivos` },
          orphanQuarterObjectives.map(makeQuarterObjectiveNode),
        ),
      );
    }

    const strategyRoot = node("strategy-root", { kind: "strategyRoot" }, [...placeholders, ...topStrategy, ...groups]);
    return [node("vision", { kind: "vision" }, [strategyRoot])];
  }, [
    annualByStrategyId,
    annualObjectives,
    cycleById,
    filterActive,
    krsByObjectiveId,
    orphanQuarterObjectives,
    peopleById,
    quarterChildrenByAnnualKrId,
    quarterObjectives,
    strategy,
  ]);

  const visionText = (fundamentals?.vision ?? "").trim();

  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Mapa Estratégico-Tático-Operacional</div>
          <div className="mt-1 text-xs text-muted-foreground">
            {filterActive
              ? `Filtrando por time: ${departmentsById.get(teamId)?.name ?? "—"} (mantendo fundamentos + longo prazo no caminho)`
              : ""}
          </div>
        </div>

        <div className="grid w-full gap-3 sm:grid-cols-3 lg:w-[780px]">
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
          <div className="grid gap-2">
            <Label className="text-xs">Time</Label>
            <Select value={teamId} onValueChange={setTeamId}>
              <SelectTrigger className="h-11 rounded-2xl bg-white">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent className="rounded-2xl">
                <SelectItem value="ALL">Todos os times</SelectItem>
                {departmentOptions.map((d) => (
                  <SelectItem key={d.id} value={d.id}>
                    {d.name}
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
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        className="absolute -right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-white text-[color:var(--sinaxys-primary)] shadow-sm ring-1 ring-[color:var(--map-strategy-border)] transition hover:bg-[color:var(--sinaxys-bg)]"
                        title="Adicionar"
                        aria-label="Adicionar"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      side="right"
                      className="w-56 rounded-2xl border-[color:var(--sinaxys-border)] bg-white p-2 shadow-lg"
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <div className="grid gap-1">
                        <Button
                          variant="ghost"
                          className="h-10 justify-start rounded-xl"
                          onClick={() => openCreateOkr("annualUnderStrategy", d.so.id)}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Criar objetivo do ano
                        </Button>
                        <Button
                          variant="ghost"
                          className="h-10 justify-start rounded-xl"
                          onClick={() => {
                            // Create KR for the first annual objective under this strategy objective (if any)
                            const annualKids = annualByStrategyId.get(d.so.id) ?? [];
                            const first = annualKids[0];
                            if (!first) {
                              toast({
                                title: "Crie um objetivo do ano primeiro",
                                description: "Para criar um KR, primeiro crie um objetivo do ano abaixo deste objetivo de longo prazo.",
                                variant: "destructive",
                              });
                              return;
                            }
                            openCreateKr(first.id);
                          }}
                        >
                          <Target className="mr-2 h-4 w-4" />
                          Criar Key Result (KR)
                        </Button>

                      </div>
                    </PopoverContent>
                  </Popover>
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

                {canEdit ? (
                  <Popover>
                    <PopoverTrigger asChild>
                      <button
                        type="button"
                        onPointerDown={(e) => e.stopPropagation()}
                        className="absolute -right-3 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-full bg-white text-[color:var(--sinaxys-primary)] shadow-sm ring-1 ring-[color:var(--map-objectives-border)] transition hover:bg-[color:var(--sinaxys-bg)]"
                        title="Adicionar"
                        aria-label="Adicionar"
                      >
                        <Plus className="h-4 w-4" />
                      </button>
                    </PopoverTrigger>
                    <PopoverContent
                      align="start"
                      side="right"
                      className="w-56 rounded-2xl border-[color:var(--sinaxys-border)] bg-white p-2 shadow-lg"
                      onPointerDown={(e) => e.stopPropagation()}
                    >
                      <div className="grid gap-1">
                        <Button
                          variant="ghost"
                          className={cn("h-10 justify-start rounded-xl", !canCreateBelow && "opacity-50")}
                          disabled={!canCreateBelow}
                          onClick={() => openCreateOkr("quarterUnderAnnual", d.objective.id)}
                          title={canCreateBelow ? "Criar objetivo do trimestre abaixo" : "Disponível apenas para objetivos do ano"}
                        >
                          <Plus className="mr-2 h-4 w-4" />
                          Criar objetivo abaixo
                        </Button>
                        <Button
                          variant="ghost"
                          className="h-10 justify-start rounded-xl"
                          onClick={() => openCreateKr(d.objective.id)}
                        >
                          <Target className="mr-2 h-4 w-4" />
                          Criar Key Result (KR)
                        </Button>
                      </div>
                    </PopoverContent>
                  </Popover>
                ) : null}
              </div>
            );
          }

          const pct = d.pct;
          const unit = d.kr.metric_unit?.trim() ?? "";
          const unitSuffix = unit ? ` ${unit}` : "";
          const fmt = (v: number | null) => {
            if (typeof v !== "number" || !Number.isFinite(v)) return "—";
            return v.toLocaleString("pt-BR", { maximumFractionDigits: 2 });
          };

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

                {d.kr.kind === "METRIC" ? (
                  <div className="mt-2 grid grid-cols-3 gap-2">
                    <div className="rounded-xl bg-white/70 px-2 py-1 ring-1 ring-[color:var(--map-objectives-border)]">
                      <div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Partida</div>
                      <div className="text-[11px] font-semibold text-[color:var(--sinaxys-ink)]">
                        {fmt(d.kr.start_value)}{unitSuffix}
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/70 px-2 py-1 ring-1 ring-[color:var(--map-objectives-border)]">
                      <div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Atual</div>
                      <div className="text-[11px] font-semibold text-[color:var(--sinaxys-ink)]">
                        {fmt(d.kr.current_value)}{unitSuffix}
                      </div>
                    </div>
                    <div className="rounded-xl bg-white/70 px-2 py-1 ring-1 ring-[color:var(--map-objectives-border)]">
                      <div className="text-[9px] font-semibold uppercase tracking-wide text-muted-foreground">Destino</div>
                      <div className="text-[11px] font-semibold text-[color:var(--sinaxys-ink)]">
                        {fmt(d.kr.target_value)}{unitSuffix}
                      </div>
                    </div>
                  </div>
                ) : null}

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

      <Dialog
        open={createKrOpen}
        onOpenChange={(v) => {
          if (creatingKr) return;
          setCreateKrOpen(v);
          if (!v) setCreateKrObjectiveId(null);
        }}
      >
        <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Criar Key Result (KR)</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select value={createKrKind} onValueChange={(v) => setCreateKrKind(v as KrKind)} disabled={creatingKr}>
                <SelectTrigger className="h-11 rounded-2xl bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="METRIC">Métrico (de → para)</SelectItem>
                  <SelectItem value="DELIVERABLE">Entregável (até data)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Título</Label>
              <Input className="h-11 rounded-2xl" value={createKrTitle} onChange={(e) => setCreateKrTitle(e.target.value)} disabled={creatingKr} />
            </div>

            <div className="grid gap-2">
              <Label>Responsável (opcional)</Label>
              <Select
                value={createKrOwner ?? "__none__"}
                onValueChange={(v) => setCreateKrOwner(v === "__none__" ? null : v)}
                disabled={creatingKr}
              >
                <SelectTrigger className="h-11 rounded-2xl bg-white">
                  <SelectValue placeholder="Sem responsável" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="__none__">Sem responsável</SelectItem>
                  {peopleOptions.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {createKrKind === "METRIC" ? (
              <div className="grid gap-3 md:grid-cols-3">
                <div className="grid gap-2">
                  <Label>Origem</Label>
                  <Input className="h-11 rounded-2xl" inputMode="decimal" value={createKrStart} onChange={(e) => setCreateKrStart(e.target.value)} placeholder="0" />
                </div>
                <div className="grid gap-2">
                  <Label>Meta</Label>
                  <Input className="h-11 rounded-2xl" inputMode="decimal" value={createKrTarget} onChange={(e) => setCreateKrTarget(e.target.value)} placeholder="100" />
                </div>
                <div className="grid gap-2">
                  <Label>Unidade (opcional)</Label>
                  <Input className="h-11 rounded-2xl" value={createKrUnit} onChange={(e) => setCreateKrUnit(e.target.value)} placeholder="%, R$, pts…" />
                </div>
              </div>
            ) : (
              <div className="grid gap-2">
                <Label>Prazo (opcional)</Label>
                <Input className="h-11 rounded-2xl" type="date" value={createKrDue} onChange={(e) => setCreateKrDue(e.target.value)} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" className="h-11 rounded-2xl bg-white" onClick={() => setCreateKrOpen(false)} disabled={creatingKr}>
              Cancelar
            </Button>
            <Button
              className="h-11 rounded-2xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={creatingKr || !createKrObjectiveId || createKrTitle.trim().length < 4}
              onClick={async () => {
                if (!createKrObjectiveId) return;
                setCreatingKr(true);
                try {
                  const toNum = (s: string) => {
                    const raw = s.trim();
                    if (!raw) return null;

                    // Accept pt-BR formatting and accidental suffixes (e.g., "%", spaces)
                    // Examples accepted: "30", "30,5", "1.200", "1.200,50", "30%"
                    const token = raw.match(/-?\d+(?:[\.,]\d+)?/)?.[0] ?? "";
                    if (!token) return null;

                    const hasComma = token.includes(",");
                    const hasDot = token.includes(".");

                    let cleaned = token;
                    if (hasComma && hasDot) {
                      // assume dot is thousands separator and comma is decimal separator
                      cleaned = cleaned.replace(/\./g, "").replace(",", ".");
                    } else if (hasComma) {
                      cleaned = cleaned.replace(",", ".");
                    }

                    const n = Number.parseFloat(cleaned);
                    return Number.isFinite(n) ? n : null;
                  };

                  const kind: KrKind = createKrKind;
                  const confidence: KrConfidence = "ON_TRACK";

                  const start = kind === "METRIC" ? toNum(createKrStart) : null;
                  const target = kind === "METRIC" ? toNum(createKrTarget) : null;
                  if (kind === "METRIC" && (start === null || target === null)) {
                    throw new Error("Preencha origem e meta com números válidos.");
                  }

                  const created = await createKeyResult({
                    objective_id: createKrObjectiveId,
                    title: createKrTitle,
                    kind,
                    due_at: kind === "DELIVERABLE" ? (createKrDue.trim() || null) : null,
                    achieved: false,
                    metric_unit: kind === "METRIC" ? (createKrUnit.trim() || null) : null,
                    start_value: kind === "METRIC" ? start : null,
                    target_value: kind === "METRIC" ? target : null,
                    current_value: kind === "METRIC" ? start : null,
                    owner_user_id: createKrOwner,
                    confidence,
                  });

                  await qc.invalidateQueries({ queryKey: ["okr-map-canvas-krs", companyId] });
                  toast({ title: "KR criado" });
                  setCreateKrOpen(false);

                  // Abrir imediatamente o editor do KR (no mapa)
                  setEditingKr(created);
                  setKrDialogOpen(true);
                } catch (e) {
                  toast({
                    title: "Não foi possível criar",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                } finally {
                  setCreatingKr(false);
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