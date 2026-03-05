import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Pencil, Plus, Target, Trash2, Wand2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectSeparator, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCompanyModuleEnabled } from "@/hooks/useCompanyModuleEnabled";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { brl, brlPerHourFromMonthly, hourlyFromMonthly } from "@/lib/costs";
import { listDepartments } from "@/lib/departmentsDb";
import { listProfilesByCompany } from "@/lib/profilesDb";
import { laborCostFromMonthly, parsePtNumber, roiPct } from "@/lib/roi";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { OkrObjectiveCard } from "@/components/okr/OkrObjectiveCard";
import { TierBadge, DepartmentMultiSelect, UserMultiSelect } from "@/components/okr";
import { useSyncAcrossViews } from "@/hooks/useSyncAcrossViews";

import {
  createKeyResult,
  createOkrCycle,
  createOkrObjective,
  deleteOkrObjectiveCascade,
  ensureOkrCycle,
  getCompanyFundamentals,
  krProgressPct,
  listKeyResults,
  listOkrCycles,
  listOkrObjectives,
  updateOkrObjective,
  type CycleStatus,
  type CycleType,
  type DbOkrObjective,
  type KrConfidence,
  type KrKind,
  type ObjectiveLevel,
} from "@/lib/okrDb";
import { listStrategyObjectives, type DbStrategyObjective } from "@/lib/okrDb";
import { OkrPageHeader } from "@/components/OkrPageHeader";
import { OkrSubnav } from "@/components/OkrSubnav";
import { objectiveLevelLabel, objectiveTypeBadgeClass, objectiveTypeLabel } from "@/lib/okrUi";
import { listKrLinksByObjectiveId, clearKrLinksForObjective, linkObjectiveToKr } from "@/lib/okrAlignmentDb";

const SELECT_NONE = "__none__";

type OkrCyclesScope = "quarter" | "year";

function cycleLabel(c: { type: CycleType; year: number; quarter: number | null; name: string | null }) {
  const base = c.type === "ANNUAL" ? `${c.year}` : `Q${c.quarter ?? "?"} / ${c.year}`;
  return c.name?.trim() ? `${c.name} · ${base}` : base;
}

function levelBadge(level: ObjectiveLevel) {
  return (
    <div className="flex items-center gap-2">
      <span className={"rounded-full px-3 py-1 text-[11px] font-semibold " + objectiveTypeBadgeClass(level)}>{objectiveTypeLabel(level)}</span>
      <span className="rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]">
        {objectiveLevelLabel(level)}
      </span>
    </div>
  );
}

export default function OkrCycles({ scope = "quarter" }: { scope?: OkrCyclesScope }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { enabled: okrRoiEnabled } = useCompanyModuleEnabled("OKR_ROI");
  const { user } = useAuth();
  const { companyId } = useCompany();

  if (!user) return null;

  const cid = companyId ?? "";
  const hasCompany = !!companyId;

  const isAdminish = user.role === "ADMIN" || user.role === "HEAD" || user.role === "MASTERADMIN";

  const { data: fundamentals } = useQuery({
    queryKey: ["okr-fundamentals", cid],
    enabled: hasCompany,
    queryFn: () => getCompanyFundamentals(cid),
  });

  const { data: cycles = [] } = useQuery({
    queryKey: ["okr-cycles", cid],
    enabled: hasCompany,
    queryFn: () => listOkrCycles(cid),
  });

  const currentYear = cycles.find((c) => c.type === "QUARTERLY" && c.status === "ACTIVE")?.year ?? new Date().getFullYear();

  const scopeCycleType: CycleType = scope === "year" ? "ANNUAL" : "QUARTERLY";
  const scopedCycles = useMemo(() => cycles.filter((c) => c.type === scopeCycleType), [cycles, scopeCycleType]);

  const defaultCycleId =
    scope === "year"
      ? (cycles.find((c) => c.type === "ANNUAL" && c.year === currentYear)?.id ?? scopedCycles[0]?.id ?? null)
      : (cycles.find((c) => c.status === "ACTIVE" && c.type === "QUARTERLY")?.id ?? scopedCycles[0]?.id ?? null);

  const [cycleId, setCycleId] = useState<string | null>(defaultCycleId);

  useEffect(() => {
    if (cycleId) return;
    if (!defaultCycleId) return;
    setCycleId(defaultCycleId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultCycleId]);

  const selected = scopedCycles.find((c) => c.id === cycleId) ?? null;

  const { data: objectives = [] } = useQuery({
    queryKey: ["okr-objectives", cid, cycleId],
    enabled: hasCompany && !!cycleId,
    queryFn: () => listOkrObjectives(cid, String(cycleId)),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles", cid],
    enabled: hasCompany,
    queryFn: () => listProfilesByCompany(cid),
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments", cid],
    enabled: hasCompany,
    queryFn: () => listDepartments(cid),
  });

  const { data: strategyObjectives = [] } = useQuery({
    queryKey: ["okr-strategy", cid],
    enabled: hasCompany,
    queryFn: () => listStrategyObjectives(cid),
    staleTime: 60_000,
  });

  const strategyOptions = useMemo(() => {
    return [...strategyObjectives]
      .sort((a, b) => (a.horizon_years - b.horizon_years) || (a.order_index - b.order_index) || a.title.localeCompare(b.title, "pt-BR"))
      .map((so) => ({ id: so.id, label: `${so.title} • ${so.horizon_years} anos` }));
  }, [strategyObjectives]);

  const byUserId = useMemo(() => {
    return new Map(
      profiles.map((p) => [
        p.id,
        {
          name: p.name ?? p.email,
          monthlyCostBRL: p.monthly_cost_brl,
          departmentId: p.department_id,
        },
      ] as const),
    );
  }, [profiles]);

  // Stats for all objectives shown on this screen
  const statsObjectiveIds = useMemo(() => {
    const ids = new Set<string>();
    for (const o of objectives) ids.add(o.id);
    return Array.from(ids);
  }, [objectives]);

  const { data: objectiveStats = new Map<string, { count: number; pct: number | null }>() } = useQuery({
    queryKey: ["okr-kr-stats", cid, cycleId, statsObjectiveIds.join(",")],
    enabled: hasCompany && statsObjectiveIds.length > 0,
    queryFn: async () => {
      const m = new Map<string, { count: number; pct: number | null }>();
      await Promise.all(
        statsObjectiveIds.map(async (objectiveId) => {
          const krs = await listKeyResults(objectiveId);
          const pcts = krs
            .map((k) => krProgressPct(k))
            .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
          const pct = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
          m.set(objectiveId, { count: krs.length, pct });
        }),
      );
      return m;
    },
  });

  const [cycleOpen, setCycleOpen] = useState(false);
  const [cycleType, setCycleType] = useState<CycleType>("QUARTERLY");
  const [cycleYear, setCycleYear] = useState(() => new Date().getFullYear());
  const [cycleQuarter, setCycleQuarter] = useState<1 | 2 | 3 | 4>(1);
  const [cycleStatus, setCycleStatus] = useState<CycleStatus>("ACTIVE");
  const [cycleName, setCycleName] = useState("");
  const [cycleSaving, setCycleSaving] = useState(false);

  const resetCycle = () => {
    setCycleType(scope === "year" ? "ANNUAL" : "QUARTERLY");
    setCycleYear(new Date().getFullYear());
    setCycleQuarter(1);
    setCycleStatus("ACTIVE");
    setCycleName("");
  };

  const [objOpen, setObjOpen] = useState(false);
  const [editingObjectiveId, setEditingObjectiveId] = useState<string | null>(null);
  const [objLevel, setObjLevel] = useState<ObjectiveLevel>("COMPANY");
  const [objTitle, setObjTitle] = useState("");
  const [objDesc, setObjDesc] = useState("");
  const [objReason, setObjReason] = useState("");
  const [objOwner, setObjOwner] = useState<string>(user.id);
  const [objDept, setObjDept] = useState<string | null>(user.departmentId ?? null);
  const [objParent, setObjParent] = useState<string | null>(null);
  const [objStrategy, setObjStrategy] = useState<string | null>(null);
  const [objAlignKrId, setObjAlignKrId] = useState<string>(SELECT_NONE);

  const quarterStrategicObjectives = useMemo(() => {
    if (scope !== "quarter") return [] as DbOkrObjective[];
    return objectives.filter((o) => o.level === "COMPANY");
  }, [objectives, scope]);

  const { data: quarterKrOptions = [] } = useQuery({
    queryKey: ["okr-quarter-strategy-krs", cid, cycleId, quarterStrategicObjectives.map((o) => o.id).join(",")],
    enabled: hasCompany && objOpen && scope === "quarter" && !!cycleId && quarterStrategicObjectives.length > 0,
    queryFn: async () => {
      const out: Array<{ id: string; label: string; objectiveTitle: string }> = [];
      for (const o of quarterStrategicObjectives) {
        const krs = await listKeyResults(o.id);
        for (const kr of krs) {
          out.push({ id: kr.id, label: kr.title, objectiveTitle: o.title });
        }
      }
      return out;
    },
    staleTime: 20_000,
  });

  const { data: existingKrLinks = [] } = useQuery({
    queryKey: ["okr-objective-kr-links", editingObjectiveId],
    enabled: !!editingObjectiveId && objOpen,
    queryFn: () => listKrLinksByObjectiveId(String(editingObjectiveId)),
    staleTime: 10_000,
  });

  useEffect(() => {
    if (!objOpen) return;
    if (scope !== "quarter") return;
    if (!editingObjectiveId) {
      setObjAlignKrId(SELECT_NONE);
      return;
    }
    const first = existingKrLinks[0]?.key_result_id ?? null;
    setObjAlignKrId(first ?? SELECT_NONE);
  }, [editingObjectiveId, existingKrLinks, objOpen, scope]);

  const [objExpected, setObjExpected] = useState<string>("80");

  const [objValue, setObjValue] = useState("");
  const [objEffortHours, setObjEffortHours] = useState("");
  const [objSaving, setObjSaving] = useState(false);

  const resetObjective = () => {
    setEditingObjectiveId(null);
    setObjLevel("COMPANY");
    setObjTitle("");
    setObjDesc("");
    setObjReason("");
    setObjOwner(user.id);
    setObjDept(user.departmentId ?? null);
    setObjParent(null);
    setObjStrategy(null);
    setObjAlignKrId(SELECT_NONE);
    setObjExpected("80");
    setObjValue("");
    setObjEffortHours("");
  };

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteObjectiveId, setDeleteObjectiveId] = useState<string | null>(null);

  const [krOpen, setKrOpen] = useState(false);
  const [krObjectiveId, setKrObjectiveId] = useState<string | null>(null);
  const [krKind, setKrKind] = useState<KrKind>("METRIC");
  const [krTitle, setKrTitle] = useState("");
  const [krUnit, setKrUnit] = useState("");
  const [krStart, setKrStart] = useState<string>("");
  const [krTarget, setKrTarget] = useState<string>("");
  const [krCurrent, setKrCurrent] = useState<string>("");
  const [krDue, setKrDue] = useState<string>("");
  const [krConfidence, setKrConfidence] = useState<KrConfidence>("ON_TRACK");
  const [krOwner, setKrOwner] = useState<string | null>(null);
  const [krSaving, setKrSaving] = useState(false);

  const resetKr = () => {
    setKrObjectiveId(null);
    setKrKind("METRIC");
    setKrTitle("");
    setKrUnit("");
    setKrStart("");
    setKrTarget("");
    setKrCurrent("");
    setKrDue("");
    setKrConfidence("ON_TRACK");
    setKrOwner(null);
  };

  async function ensureCurrentAnnualCycle(): Promise<string> {
    const existing = cycles.find((c) => c.type === "ANNUAL" && c.year === currentYear)?.id ?? null;
    if (existing) return existing;

    // Use edge function so non-admin users can still open cycles as needed.
    const created = await ensureOkrCycle({
      type: "ANNUAL",
      year: currentYear,
      quarter: null,
      status: "ACTIVE",
      name: null,
    });

    await qc.invalidateQueries({ queryKey: ["okr-cycles", cid] });
    return created.id;
  }

  async function ensureCurrentQuarterCycle(): Promise<string> {
    const q = (Math.floor(new Date().getMonth() / 3) + 1) as 1 | 2 | 3 | 4;
    const existing = cycles.find((c) => c.type === "QUARTERLY" && c.year === currentYear && c.quarter === q)?.id ?? null;
    if (existing) return existing;

    const created = await ensureOkrCycle({
      type: "QUARTERLY",
      year: currentYear,
      quarter: q,
      status: "ACTIVE",
      name: null,
    });

    await qc.invalidateQueries({ queryKey: ["okr-cycles", cid] });
    return created.id;
  }

  const requiresBusinessCase = !!objDept;
  const ownerMonthly = byUserId.get(objOwner)?.monthlyCostBRL ?? null;
  const valueBRL = parsePtNumber(objValue);
  const effortHours = parsePtNumber(objEffortHours);

  const deptMembers = useMemo(() => {
    if (!objDept) return [] as typeof profiles;
    return profiles.filter((p) => p.department_id === objDept && p.active);
  }, [objDept, profiles]);

  const deptAvgHourly = useMemo(() => {
    const rates = deptMembers
      .map((p) => (typeof p.monthly_cost_brl === "number" ? hourlyFromMonthly(p.monthly_cost_brl) : null))
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v) && v > 0);
    if (!rates.length) return null;
    return rates.reduce((a, b) => a + b, 0) / rates.length;
  }, [deptMembers]);

  const costBRL = useMemo(() => {
    if (objLevel === "COMPANY") {
      if (!effortHours || effortHours <= 0) return null;
      // Para Empresa: orçar pelo time/área participante (média do custo/h dos colaboradores do departamento)
      if (deptAvgHourly) return deptAvgHourly * effortHours;
      // Fallback: se ninguém do dept tem custo cadastrado, usa o dono
      return laborCostFromMonthly(ownerMonthly, effortHours);
    }

    return laborCostFromMonthly(ownerMonthly, effortHours);
  }, [deptAvgHourly, effortHours, objLevel, ownerMonthly]);

  const roi = roiPct(valueBRL, costBRL);

  const expectedAtt = parsePtNumber(objExpected);

  const businessCaseOk =
    expectedAtt !== null && expectedAtt >= 0 && expectedAtt <= 100 &&
    (!requiresBusinessCase ||
      !okrRoiEnabled ||
      (!!valueBRL && valueBRL > 0 && !!effortHours && effortHours > 0 && ((objLevel === "COMPANY" ? !!objDept : true)) && costBRL !== null && roi !== null));

  if (!hasCompany) {
    return (
      <div className="grid gap-6">
        <OkrPageHeader
          title="Ciclos & OKRs"
          subtitle="Carregando contexto da empresa…"
          icon={<Target className="h-5 w-5" />}
        />

        <OkrSubnav />

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-sm text-muted-foreground">Aguardando identificação da empresa do seu usuário…</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <OkrPageHeader
        title={scope === "year" ? "Objetivos do ano" : "Objetivos do trimestre"}
        subtitle={
          scope === "year"
            ? "Revise e mantenha os objetivos anuais — com KRs, progresso e responsáveis."
            : "Acompanhe os objetivos do trimestre — com KRs, progresso e responsáveis."
        }
        icon={<Target className="h-5 w-5" />}
      />

      <OkrSubnav />

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Selecionar {scope === "year" ? "ano" : "trimestre"}</div>
            <p className="mt-1 text-sm text-muted-foreground">Você pode manter histórico de {scope === "year" ? "anos" : "trimestres"}.</p>
          </div>

          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:flex-wrap md:items-center md:justify-end">
            <Select value={cycleId ?? ""} onValueChange={(v) => setCycleId(v)}>
              <SelectTrigger className="h-11 w-full rounded-xl md:w-[340px]">
                <SelectValue placeholder={scope === "year" ? "Escolha um ano" : "Escolha um trimestre"} />
              </SelectTrigger>
              <SelectContent>
                {scopedCycles.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {cycleLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {isAdminish && scope === "quarter" ? (
              <Button
                variant="outline"
                className="h-11 rounded-xl bg-white"
                onClick={() => {
                  resetCycle();
                  setCycleType("QUARTERLY");
                  setCycleOpen(true);
                }}
                title="Adicionar outro trimestre"
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo trimestre
              </Button>
            ) : null}

            {isAdminish && scope === "year" ? (
              <Button
                variant="outline"
                className="h-11 rounded-xl bg-white"
                onClick={() => {
                  resetCycle();
                  setCycleType("ANNUAL");
                  setCycleOpen(true);
                }}
                title="Adicionar outro ano"
              >
                <Plus className="mr-2 h-4 w-4" />
                Novo ano
              </Button>
            ) : null}

            {selected ? (
              <Badge className="h-11 justify-center rounded-xl bg-[color:var(--sinaxys-tint)] px-4 text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                {selected.status}
              </Badge>
            ) : null}
          </div>
        </div>

        {!selected ? (
          <div className="mt-5 rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">
            Nenhum {scope === "year" ? "ano" : "trimestre"} disponível.
          </div>
        ) : null}
      </Card>

      <Dialog
        open={cycleOpen}
        onOpenChange={(v) => {
          if (!cycleSaving) setCycleOpen(v);
          if (!v) resetCycle();
        }}
      >
        <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{cycleType === "ANNUAL" ? "Novo ano" : "Novo trimestre"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select value={cycleType} onValueChange={(v) => setCycleType(v as CycleType)} disabled>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="QUARTERLY">Trimestre</SelectItem>
                  <SelectItem value="ANNUAL">Ano</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className={cycleType === "QUARTERLY" ? "grid gap-4 md:grid-cols-2" : "grid gap-4"}>
              <div className="grid gap-2">
                <Label>Ano</Label>
                <Input
                  className="h-11 rounded-xl"
                  type="number"
                  inputMode="numeric"
                  value={String(cycleYear)}
                  onChange={(e) => setCycleYear(Number(e.target.value) || new Date().getFullYear())}
                  disabled={cycleSaving}
                />
              </div>

              {cycleType === "QUARTERLY" ? (
                <div className="grid gap-2">
                  <Label>Trimestre</Label>
                  <Select value={String(cycleQuarter)} onValueChange={(v) => setCycleQuarter(Number(v) as 1 | 2 | 3 | 4)} disabled={cycleSaving}>
                    <SelectTrigger className="h-11 rounded-xl bg-white">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="1">Q1</SelectItem>
                      <SelectItem value="2">Q2</SelectItem>
                      <SelectItem value="3">Q3</SelectItem>
                      <SelectItem value="4">Q4</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              ) : null}
            </div>

            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={cycleStatus} onValueChange={(v) => setCycleStatus(v as CycleStatus)} disabled={cycleSaving}>
                <SelectTrigger className="h-11 rounded-xl bg-white">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value="PLANNING">PLANNING</SelectItem>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="CLOSED">CLOSED</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Nome (opcional)</Label>
              <Input className="h-11 rounded-xl" value={cycleName} onChange={(e) => setCycleName(e.target.value)} disabled={cycleSaving} placeholder="Ex.: Planejamento 2026" />
            </div>

            <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">
              Dica: crie trimestres futuros como <span className="font-medium text-[color:var(--sinaxys-ink)]">PLANNING</span> e ative quando o ciclo começar.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="h-11 rounded-xl" onClick={() => setCycleOpen(false)} disabled={cycleSaving}>
              Cancelar
            </Button>
            <Button
              className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={cycleSaving}
              onClick={async () => {
                if (cycleSaving) return;
                setCycleSaving(true);
                try {
                  const ensured = await ensureOkrCycle({
                    type: cycleType,
                    year: cycleYear,
                    quarter: cycleType === "QUARTERLY" ? cycleQuarter : null,
                    status: cycleStatus,
                    name: cycleName.trim() || null,
                  });

                  await qc.invalidateQueries({ queryKey: ["okr-cycles", cid] });
                  setCycleId(ensured.id);
                  setCycleOpen(false);
                  toast({ title: cycleType === "ANNUAL" ? "Ano criado" : "Trimestre criado" });
                } catch (e) {
                  toast({
                    title: "Não foi possível criar",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                } finally {
                  setCycleSaving(false);
                }
              }}
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">
              {scope === "year"
                ? `Objetivos do ano (${selected?.year ?? currentYear})`
                : selected
                  ? `Objetivos do trimestre (${cycleLabel(selected)})`
                  : "Objetivos do trimestre"}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">Expanda um objetivo para ver os KRs.</p>
          </div>

          {isAdminish ? (
            <Button
              className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              onClick={async () => {
                resetObjective();
                try {
                  if (!selected) {
                    const ensuredId = scope === "year" ? await ensureCurrentAnnualCycle() : await ensureCurrentQuarterCycle();
                    setCycleId(ensuredId);
                  }
                  setObjOpen(true);
                } catch (e) {
                  toast({
                    title: "Não foi possível abrir",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                }
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              {scope === "year" ? "Novo objetivo do ano" : "Novo objetivo do trimestre"}
            </Button>
          ) : null}
        </div>

        <Separator className="my-5" />

        <div className="grid gap-3">
          {objectives.length ? (
            (scope === "quarter"
              ? objectives.filter((o) => o.level === "COMPANY" || isAdminish || o.owner_user_id === user.id)
              : objectives
            ).map((o) => {
              const owner = byUserId.get(o.owner_user_id)?.name ?? "—";
              const st = objectiveStats.get(o.id) ?? { count: 0, pct: null };
              const canWriteObjective = user.id === o.owner_user_id || isAdminish;

              return (
                <OkrObjectiveCard
                  key={o.id}
                  objective={o}
                  ownerName={owner}
                  krCount={st.count}
                  avgProgressPct={st.pct}
                  levelBadge={levelBadge(o.level)}
                  canWriteObjective={canWriteObjective}
                  openHref={`/okr/objetivos/${o.id}`}
                  companyId={cid}
                  currentUserId={user.id}
                  isAdminish={isAdminish}
                  departments={departments}
                  byUserId={byUserId}
                  onRequestEditObjective={(obj) => {
                    setEditingObjectiveId(obj.id);
                    setObjLevel(obj.level);
                    setObjTitle(obj.title);
                    setObjDesc(obj.description ?? "");
                    setObjReason(obj.strategic_reason ?? "");
                    setObjOwner(obj.owner_user_id);
                    setObjDept(obj.department_id);
                    setObjParent(obj.parent_objective_id);
                    setObjExpected(typeof obj.expected_attainment_pct === "number" ? String(obj.expected_attainment_pct) : "80");
                    setObjValue(typeof obj.estimated_value_brl === "number" ? String(obj.estimated_value_brl) : "");
                    setObjEffortHours(typeof obj.estimated_effort_hours === "number" ? String(obj.estimated_effort_hours) : "");
                    setObjOpen(true);
                  }}
                  onRequestDeleteObjective={(objectiveId) => {
                    setDeleteObjectiveId(objectiveId);
                    setDeleteOpen(true);
                  }}
                  onRequestAddKr={(objectiveId) => {
                    resetKr();
                    setKrObjectiveId(objectiveId);
                    setKrOpen(true);
                  }}
                  onEdit={
                    canWriteObjective
                      ? () => {
                          setEditingObjectiveId(o.id);
                          setObjLevel(o.level);
                          setObjTitle(o.title);
                          setObjDesc(o.description ?? "");
                          setObjReason(o.strategic_reason ?? "");
                          setObjOwner(o.owner_user_id);
                          setObjDept(o.department_id);
                          setObjParent(o.parent_objective_id);
                          setObjExpected(typeof o.expected_attainment_pct === "number" ? String(o.expected_attainment_pct) : "80");
                          setObjValue(typeof o.estimated_value_brl === "number" ? String(o.estimated_value_brl) : "");
                          setObjEffortHours(typeof o.estimated_effort_hours === "number" ? String(o.estimated_effort_hours) : "");
                          setObjOpen(true);
                        }
                      : undefined
                  }
                  onDelete={
                    canWriteObjective
                      ? () => {
                          setDeleteObjectiveId(o.id);
                          setDeleteOpen(true);
                        }
                      : undefined
                  }
                  onAddKr={
                    canWriteObjective
                      ? () => {
                          resetKr();
                          setKrObjectiveId(o.id);
                          setKrOpen(true);
                        }
                      : undefined
                  }
                />
              );
            })
          ) : (
            <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">
              Nenhum objetivo neste {scope === "year" ? "ano" : "trimestre"}.
            </div>
          )}

        </div>
      </Card>

      <Dialog
        open={objOpen}
        onOpenChange={(v) => {
          setObjOpen(v);
          if (!v) resetObjective();
        }}
      >
        <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editingObjectiveId ? "Editar objetivo" : scope === "year" ? "Novo objetivo do ano" : "Novo objetivo do trimestre"}</DialogTitle>
            <DialogDescription>
              {editingObjectiveId ? "Edite os campos abaixo." : "Preencha os campos para criar um novo objetivo."}
            </DialogDescription>
          </DialogHeader>

          {/* Tier Badge no topo do formulário */}
          <div className="mb-4">
            <TierBadge tier={objLevel === "COMPANY" ? "TIER1" : "TIER2"} size="sm" />
            {levelBadge}
          </div>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Nível</Label>
              <Select
                value={objLevel}
                onValueChange={(v) => {
                  const next = v as ObjectiveLevel;
                  setObjLevel(next);
                  // Tier 1 (Estratégico) não possui objetivo pai nem alinhamento por KR.
                  if (next === "COMPANY") {
                    setObjParent(null);
                    setObjAlignKrId(SELECT_NONE);
                  }
                }}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="COMPANY">Empresa</SelectItem>
                  <SelectItem value="DEPARTMENT">Time</SelectItem>
                  <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Título do objetivo</Label>
              <Input
                className="h-11 rounded-xl"
                value={objTitle}
                onChange={(e) => setObjTitle(e.target.value)}
                placeholder="Ex.: Aumentar retenção com onboarding impecável"
              />
              <div className="text-xs text-muted-foreground">
                Dica: um bom objetivo é claro e aspiracional (evite "melhorar" sem contexto).
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Atendimento esperado (%)</Label>
              <Input className="h-11 rounded-xl" value={objExpected} onChange={(e) => setObjExpected(e.target.value)} placeholder="80" />
              <div className="text-xs text-muted-foreground">Ex.: 70–85% costuma ser meta realista para objetivos aspiracionais.</div>
            </div>

            <div className="grid gap-2">
              <Label>Descrição (opcional)</Label>
              <Textarea className="min-h-[92px] rounded-2xl" value={objDesc} onChange={(e) => setObjDesc(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label>Objetivo de longo prazo (alinhamento)</Label>
              <Select
                value={objStrategy ?? ""}
                onValueChange={(v) => {
                  setObjStrategy(v === SELECT_NONE ? null : v);
                }}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Sem vínculo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_NONE}>Sem vínculo</SelectItem>
                  {strategyOptions.map((so) => (
                    <SelectItem key={so.id} value={so.id}>
                      {so.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              </div>
              <div className="text-xs text-muted-foreground">Vincule o objetivo do ano ao objetivo de longo prazo (ex.: 2 anos) para aparecer no mapa.</div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Responsáveis (múltiplos)</Label>
                <UserMultiSelect
                  users={profiles}
                  value={objOwner ? [objOwner] : []}
                  onChange={(ids) => setObjOwner(ids[0] || "")}
                  placeholder="Selecione responsáveis..."
                  disabled={false}
                />
              </div>

              <div className="grid gap-2">
                <label className="text-sm font-medium">Departamentos (múltiplos)</label>
                <DepartmentMultiSelect
                  departments={departments}
                  value={objDept ? [objDept] : []}
                  onChange={(ids) => setObjDept(ids[0] || null)}
                  placeholder="Selecione departamentos..."
                  disabled={false}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Impacto estimado (R$)</Label>
              <Input className="h-11 rounded-xl" value={objValue} onChange={(e) => setObjValue(e.target.value)} placeholder="50000" />
            </div>

            <div className="grid gap-2">
              <Label>Esforço estimado (horas)</Label>
              <Input
                className="h-11 rounded-xl"
                value={objEffortHours}
                onChange={(e) => setObjEffortHours(e.target.value)}
                placeholder="40"
              />
            </div>

            <div className="mt-3 rounded-2xl bg-white p-3 ring-1 ring-[color:var(--sinaxys-border)]">
              <div className="text-xs text-muted-foreground">
                {objLevel === "COMPANY"
                  ? `Custo/h do time: ${deptAvgHourly ? `${brl(deptAvgHourly)}/h` : "—"}`
                  : `Custo/h do responsável: ${brlPerHourFromMonthly(ownerMonthly ?? 0)}`}
              </div>
              {objLevel === "COMPANY" ? (
                <div className="mt-1 text-xs text-muted-foreground">
                  Base: {deptMembers.length} colaboradores ativos no time • {deptMembers.filter((p) => typeof p.monthly_cost_brl === "number" && p.monthly_cost_brl > 0).length} com custo cadastrado.
                </div>
              ) : null}
              <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                <span className="text-muted-foreground">Custo estimado:</span>
                <span className="font-semibold text-[color:var(--sinaxys-ink)]">{costBRL !== null ? brl(costBRL) : "—"}</span>
                <span className="text-muted-foreground">• ROI:</span>
                <span className="font-semibold text-[color:var(--sinaxys-ink)]">{roi !== null ? `${roi.toFixed(1)}%` : "—"}</span>
              </div>
            </div>

            {scope === "quarter" && objLevel !== "COMPANY" ? (
              <div className="grid gap-2">
                <Label>KR do objetivo estratégico do trimestre</Label>
                <Select value={objAlignKrId} onValueChange={setObjAlignKrId}>
                  <SelectTrigger className="h-11 rounded-xl bg-white/70 dark:bg-[color:var(--sinaxys-tint)]">
                    <SelectValue placeholder="Selecione um KR" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value={SELECT_NONE}>Selecione um KR</SelectItem>
                    {quarterKrOptions
                      .slice()
                      .sort((a, b) => (a.objectiveTitle.localeCompare(b.objectiveTitle, "pt-BR") || a.label.localeCompare(b.label, "pt-BR")))
                      .map((kr) => (
                        <SelectItem key={kr.id} value={kr.id}>
                          {kr.objectiveTitle} — {kr.label}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                {quarterKrOptions.length ? (
                  <div className="text-xs text-muted-foreground">OKRs de time (Tier 2) do trimestre precisam se alinhar a um KR do objetivo estratégico (Tier 1) do mesmo trimestre.</div>
                ) : (
                  <div className="text-xs text-muted-foreground">
                    Primeiro crie um objetivo estratégico (Tier 1) para este trimestre e adicione pelo menos um KR para poder vincular os OKRs de time.
                  </div>
                )}
              </div>
            ) : null}

            {objLevel !== "COMPANY" ? (
              <div className="grid gap-2">
                <Label>Objetivo pai (alinhamento opcional)</Label>
                <Select
                  value={objParent ?? SELECT_NONE}
                  onValueChange={(v) => {
                    setObjParent(v === SELECT_NONE ? null : v);
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl bg-white/70 dark:bg-[color:var(--sinaxys-tint)]">
                    <SelectValue placeholder="Sem objetivo pai" />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl">
                    <SelectItem value={SELECT_NONE}>Sem objetivo pai</SelectItem>
                    {objectives
                      .filter((o) => o.id !== editingObjectiveId)
                      .map((o) => (
                        <SelectItem key={o.id} value={o.id}>
                          {o.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <div className="text-xs text-muted-foreground">Use isso para manter hierarquia dentro do trimestre (ex.: iniciativa → subiniciativa).</div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setObjOpen(false)} disabled={objSaving}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={
                objSaving ||
                objTitle.trim().length < 6 ||
                !businessCaseOk ||
                expectedAtt === null ||
                (scope === "quarter" && objLevel !== "COMPANY" && (objAlignKrId === SELECT_NONE || quarterKrOptions.length === 0))
              }
              onClick={async () => {
                if (objSaving) return;
                setObjSaving(true);
                try {
                  const strategyId = scope === "year" ? objStrategy : null;
                  const requiresQuarterKrLink = scope === "quarter" && objLevel !== "COMPANY";
                  const parentForSave = objLevel === "COMPANY" ? null : objParent;

                  if (editingObjectiveId) {
                    await updateOkrObjective(editingObjectiveId, {
                      level: objLevel,
                      parent_objective_id: parentForSave,
                      strategy_objective_id: strategyId,
                      department_id: objDept,
                      owner_user_id: objOwner,
                      title: objTitle,
                      description: objDesc,
                      strategic_reason: objReason,
                      linked_fundamental: null,
                      linked_fundamental_text: null,
                      due_at: null,
                      expected_attainment_pct: expectedAtt,
                      estimated_value_brl: valueBRL,
                      estimated_effort_hours: effortHours,
                      estimated_cost_brl: costBRL !== null ? Number(costBRL.toFixed(2)) : null,
                      estimated_roi_pct: roi !== null ? Number(roi.toFixed(2)) : null,
                    });

                    if (scope === "quarter") {
                      await clearKrLinksForObjective(editingObjectiveId);
                      if (requiresQuarterKrLink && objAlignKrId !== SELECT_NONE) {
                        await linkObjectiveToKr(objAlignKrId, editingObjectiveId);
                      }

                      await qc.invalidateQueries({ queryKey: ["okr-kr-linked-objectives"] });
                    }

                    toast({ title: "Objetivo atualizado" });
                  } else {
                    const createCycleId =
                      scope === "year"
                        ? (selected?.id ?? (await ensureCurrentAnnualCycle()))
                        : (selected?.id ?? (await ensureCurrentQuarterCycle()));

                    const created = await createOkrObjective({
                      company_id: cid,
                      cycle_id: createCycleId,
                      parent_objective_id: parentForSave,
                      strategy_objective_id: strategyId,
                      level: objLevel,
                      department_id: objDept,
                      owner_user_id: objOwner,
                      title: objTitle,
                      description: objDesc,
                      strategic_reason: objReason,
                      linked_fundamental: null,
                      linked_fundamental_text: null,
                      due_at: null,
                      expected_attainment_pct: expectedAtt,
                      estimated_value_brl: valueBRL,
                      estimated_effort_hours: effortHours,
                      estimated_cost_brl: costBRL !== null ? Number(costBRL.toFixed(2)) : null,
                      estimated_roi_pct: roi !== null ? Number(roi.toFixed(2)) : null,
                      expected_profit_brl: null,
                      profit_thesis: null,
                      expected_revenue_at: null,
                    });

                    if (requiresQuarterKrLink && objAlignKrId !== SELECT_NONE) {
                      await linkObjectiveToKr(objAlignKrId, created.id);
                      await qc.invalidateQueries({ queryKey: ["okr-kr-linked-objectives"] });
                    }

                    toast({ title: "Objetivo criado" });

                    if (cycleId !== createCycleId) setCycleId(createCycleId);

                    await qc.invalidateQueries({ queryKey: ["okr-objectives", cid, createCycleId] });
                  }

                  await qc.invalidateQueries({ queryKey: ["okr-cycles", cid] });
                  await qc.invalidateQueries({ queryKey: ["okr-kr-stats", cid] });
                  await qc.invalidateQueries({ queryKey: ["okr-strategy", cid] });
                  setObjOpen(false);
                } catch (e) {
                  toast({
                    title: "Não foi possível salvar",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                } finally {
                  setObjSaving(false);
                }
              }}
            >
              {editingObjectiveId ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={deleteOpen}
        onOpenChange={(v) => {
          setDeleteOpen(v);
          if (!v) setDeleteObjectiveId(null);
        }}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir objetivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso vai apagar também KRs, entregáveis e tarefas ligados a esse objetivo. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteObjectiveId) return;
                try {
                  await deleteOkrObjectiveCascade(deleteObjectiveId);
                  await qc.invalidateQueries({ queryKey: ["okr-objectives", cid, cycleId] });
                  await qc.invalidateQueries({ queryKey: ["okr-kr-stats", cid, cycleId] });
                  toast({ title: "Objetivo excluído" });
                } catch (e) {
                  toast({
                    title: "Não foi possível excluir",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                } finally {
                  setDeleteOpen(false);
                  setDeleteObjectiveId(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={krOpen}
        onOpenChange={(v) => {
          setKrOpen(v);
          if (!v) resetKr();
        }}
      >
        <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Novo Key Result</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select value={krKind} onValueChange={(v) => setKrKind(v as KrKind)}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="METRIC">Métrica (de → para)</SelectItem>
                  <SelectItem value="DELIVERABLE">Entregável (até uma data)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>KR</Label>
              <Input
                className="h-11 rounded-xl"
                value={krTitle}
                onChange={(e) => setKrTitle(e.target.value)}
                placeholder={krKind === "DELIVERABLE" ? "Ex.: Entregar novo playbook de CS" : "Ex.: Aumentar NPS de 52 para 65"}
              />
              <div className="text-xs text-muted-foreground">
                {krKind === "DELIVERABLE"
                  ? "Quando o KR é um entregável, o atingimento é 0% ou 100%."
                  : "Evite KR qualitativo: sempre que possível, coloque número, prazo e unidade."}
              </div>
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Confiança</Label>
                <Select value={krConfidence} onValueChange={(v) => setKrConfidence(v as KrConfidence)}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ON_TRACK">ON_TRACK</SelectItem>
                    <SelectItem value="AT_RISK">AT_RISK</SelectItem>
                    <SelectItem value="OFF_TRACK">OFF_TRACK</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Responsável (opcional)</Label>
                <Select
                  value={krOwner ?? ""}
                  onValueChange={(v) => {
                    setKrOwner(v === SELECT_NONE ? null : v);
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Sem responsável" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_NONE}>Sem responsável</SelectItem>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name ?? p.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {krKind === "METRIC" ? (
              <>
                <div className="grid gap-2">
                  <Label>Unidade (opcional)</Label>
                  <Input className="h-11 rounded-xl" value={krUnit} onChange={(e) => setKrUnit(e.target.value)} placeholder="%, pts, R$…" />
                </div>

                <div className="grid gap-2 md:grid-cols-3">
                  <div className="grid gap-2">
                    <Label>Início (número)</Label>
                    <Input className="h-11 rounded-xl" value={krStart} onChange={(e) => setKrStart(e.target.value)} placeholder="52" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Atual (número)</Label>
                    <Input className="h-11 rounded-xl" value={krCurrent} onChange={(e) => setKrCurrent(e.target.value)} placeholder="56" />
                  </div>
                  <div className="grid gap-2">
                    <Label>Meta (número)</Label>
                    <Input className="h-11 rounded-xl" value={krTarget} onChange={(e) => setKrTarget(e.target.value)} placeholder="65" />
                  </div>
                </div>
              </>
            ) : (
              <div className="grid gap-2">
                <Label>Prazo (opcional)</Label>
                <Input className="h-11 rounded-xl" type="date" value={krDue} onChange={(e) => setKrDue(e.target.value)} />
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setKrOpen(false)} disabled={krSaving}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={!krObjectiveId || krTitle.trim().length < 6 || krSaving}
              onClick={async () => {
                if (!krObjectiveId || krSaving) return;
                setKrSaving(true);
                try {
                  const parseOrNull = (v: string) => {
                    const n = Number(String(v).replace(",", "."));
                    return Number.isFinite(n) ? n : null;
                  };

                  await createKeyResult({
                    objective_id: krObjectiveId,
                    title: krTitle,
                    kind: krKind,
                    due_at: krKind === "DELIVERABLE" ? (krDue.trim() || null) : null,
                    achieved: false,
                    metric_unit: krKind === "METRIC" ? krUnit.trim() || null : null,
                    start_value: krKind === "METRIC" ? parseOrNull(krStart) : null,
                    current_value: krKind === "METRIC" ? parseOrNull(krCurrent) : null,
                    target_value: krKind === "METRIC" ? parseOrNull(krTarget) : null,
                    owner_user_id: krOwner,
                    confidence: krConfidence,
                  });

                  await qc.invalidateQueries({ queryKey: ["okr-kr-stats", cid, cycleId] });
                  toast({ title: "KR criado" });
                  setKrOpen(false);
                } catch (e) {
                  toast({
                    title: "Não foi possível criar",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                } finally {
                  setKrSaving(false);
                }
              }}
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}