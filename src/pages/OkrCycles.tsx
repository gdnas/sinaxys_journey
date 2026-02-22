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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

import {
  createKeyResult,
  createOkrCycle,
  createOkrObjective,
  deleteOkrObjectiveCascade,
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
import { OkrPageHeader } from "@/components/OkrPageHeader";
import { OkrSubnav } from "@/components/OkrSubnav";
import { objectiveLevelLabel, objectiveTypeBadgeClass, objectiveTypeLabel } from "@/lib/okrUi";

const SELECT_NONE = "__none__";

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

export default function OkrCycles() {
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

  const defaultCycleId = cycles.find((c) => c.status === "ACTIVE" && c.type === "QUARTERLY")?.id ?? cycles[0]?.id ?? null;
  const [cycleId, setCycleId] = useState<string | null>(defaultCycleId);

  // When cycles load, fill the selection once.
  useEffect(() => {
    if (cycleId) return;
    if (!defaultCycleId) return;
    setCycleId(defaultCycleId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultCycleId]);

  const selected = cycles.find((c) => c.id === cycleId) ?? null;

  // Define "ano corrente" based on the active quarterly cycle if available, otherwise current date.
  const currentYear =
    cycles.find((c) => c.type === "QUARTERLY" && c.status === "ACTIVE")?.year ?? new Date().getFullYear();

  const currentAnnualCycle = cycles.find((c) => c.type === "ANNUAL" && c.year === currentYear) ?? null;

  // Objectives for the selected cycle
  const { data: objectives = [] } = useQuery({
    queryKey: ["okr-objectives", cid, cycleId],
    enabled: hasCompany && !!cycleId,
    queryFn: () => listOkrObjectives(cid, String(cycleId)),
  });

  // Objectives for the current annual cycle ("OKRs do ano")
  const { data: annualObjectives = [] } = useQuery({
    queryKey: ["okr-objectives", cid, currentAnnualCycle?.id ?? "__none__"],
    enabled: hasCompany && !!currentAnnualCycle?.id,
    queryFn: () => listOkrObjectives(cid, String(currentAnnualCycle?.id)),
  });

  // History (previous annual cycles)
  const previousAnnualCycles = useMemo(
    () => cycles.filter((c) => c.type === "ANNUAL" && c.year < currentYear).sort((a, b) => b.year - a.year),
    [cycles, currentYear],
  );
  const [historyAnnualCycleId, setHistoryAnnualCycleId] = useState<string | null>(null);

  useEffect(() => {
    if (historyAnnualCycleId) return;
    const first = previousAnnualCycles[0]?.id ?? null;
    if (first) setHistoryAnnualCycleId(first);
  }, [historyAnnualCycleId, previousAnnualCycles]);

  const historyAnnualCycle = previousAnnualCycles.find((c) => c.id === historyAnnualCycleId) ?? null;

  const { data: historyObjectives = [] } = useQuery({
    queryKey: ["okr-objectives", cid, historyAnnualCycle?.id ?? "__none__"],
    enabled: hasCompany && !!historyAnnualCycle?.id,
    queryFn: () => listOkrObjectives(cid, String(historyAnnualCycle?.id)),
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

  const deptById = useMemo(() => new Map(departments.map((d) => [d.id, d] as const)), [departments]);

  // Stats for all objectives shown on this screen (selected cycle + annual section)
  const statsObjectiveIds = useMemo(() => {
    const ids = new Set<string>();
    for (const o of objectives) ids.add(o.id);
    // In quarterly view, also show annual objectives
    if (selected?.type === "QUARTERLY") {
      for (const o of annualObjectives) ids.add(o.id);
    }
    // History card doesn't need live progress, so we don't include it here.
    return Array.from(ids);
  }, [annualObjectives, objectives, selected?.type]);

  const { data: objectiveStats = new Map<string, { count: number; pct: number | null }>() } = useQuery({
    queryKey: ["okr-kr-stats", cid, cycleId, currentAnnualCycle?.id ?? "", statsObjectiveIds.join(",")],
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
    setCycleType("QUARTERLY");
    setCycleYear(new Date().getFullYear());
    setCycleQuarter(1);
    setCycleStatus("ACTIVE");
    setCycleName("");
  };

  const [objOpen, setObjOpen] = useState(false);
  const [creatingAnnualObjective, setCreatingAnnualObjective] = useState(false);
  const [editingObjectiveId, setEditingObjectiveId] = useState<string | null>(null);
  const [objLevel, setObjLevel] = useState<ObjectiveLevel>("COMPANY");
  const [objTitle, setObjTitle] = useState("");
  const [objDesc, setObjDesc] = useState("");
  const [objReason, setObjReason] = useState("");
  const [objOwner, setObjOwner] = useState<string>(user.id);
  const [objDept, setObjDept] = useState<string | null>(user.departmentId ?? null);
  const [objParent, setObjParent] = useState<string | null>(null);

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

  const [replicateOpen, setReplicateOpen] = useState(false);
  const [replicating, setReplicating] = useState(false);

  async function ensureCurrentAnnualCycle(): Promise<string> {
    if (currentAnnualCycle?.id) return currentAnnualCycle.id;
    const created = await createOkrCycle(cid, {
      type: "ANNUAL",
      year: currentYear,
      quarter: null,
      start_date: null,
      end_date: null,
      status: "ACTIVE",
      name: null,
    });
    await qc.invalidateQueries({ queryKey: ["okr-cycles", cid] });
    return created.id;
  }

  async function replicateAnnualOkrs(sourceAnnualCycleId: string) {
    const targetAnnualCycleId = await ensureCurrentAnnualCycle();

    const srcObjectives = await listOkrObjectives(cid, sourceAnnualCycleId);

    // Keep only annual/company items by default. If you want to replicate the whole year plan, remove this filter.
    const toCopy = srcObjectives;

    // Preserve hierarchy via parent_objective_id
    const sorted = [...toCopy].sort((a, b) => {
      const ap = a.parent_objective_id ? 1 : 0;
      const bp = b.parent_objective_id ? 1 : 0;
      if (ap !== bp) return ap - bp;
      return a.created_at && b.created_at ? a.created_at.localeCompare(b.created_at) : 0;
    });

    const idMap = new Map<string, string>();

    for (const o of sorted) {
      const newParentId = o.parent_objective_id ? idMap.get(o.parent_objective_id) ?? null : null;

      const created = await createOkrObjective({
        company_id: cid,
        cycle_id: targetAnnualCycleId,
        parent_objective_id: newParentId,
        strategy_objective_id: o.strategy_objective_id,
        level: o.level,
        department_id: o.department_id,
        owner_user_id: o.owner_user_id,
        title: o.title,
        description: o.description,
        strategic_reason: o.strategic_reason,
        linked_fundamental: o.linked_fundamental,
        linked_fundamental_text: o.linked_fundamental_text,
        due_at: o.due_at,
        expected_attainment_pct: o.expected_attainment_pct,
        estimated_value_brl: o.estimated_value_brl,
        estimated_effort_hours: o.estimated_effort_hours,
        estimated_cost_brl: o.estimated_cost_brl,
        estimated_roi_pct: o.estimated_roi_pct,
        expected_profit_brl: o.expected_profit_brl,
        profit_thesis: o.profit_thesis,
        expected_revenue_at: o.expected_revenue_at ?? null,
      });

      idMap.set(o.id, created.id);

      // Replicate KRs
      const srcKrs = await listKeyResults(o.id);
      for (const kr of srcKrs) {
        await createKeyResult({
          objective_id: created.id,
          title: kr.title,
          kind: kr.kind,
          due_at: kr.due_at,
          achieved: false,
          metric_unit: kr.metric_unit,
          start_value: kr.start_value,
          target_value: kr.target_value,
          current_value: kr.start_value,
          owner_user_id: kr.owner_user_id,
          confidence: "ON_TRACK",
        });
      }
    }

    await qc.invalidateQueries({ queryKey: ["okr-objectives", cid, targetAnnualCycleId] });
    await qc.invalidateQueries({ queryKey: ["okr-kr-stats", cid] });
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
        title="Ciclos & OKRs"
        subtitle="Crie e acompanhe ciclos trimestrais e anuais — com ROI opcional por departamento."
        icon={<Target className="h-5 w-5" />}
      />

      <OkrSubnav />

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Selecionar ciclo</div>
            <p className="mt-1 text-sm text-muted-foreground">Você pode manter histórico de trimestres e anos.</p>
          </div>

          <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:flex-wrap md:items-center md:justify-end">
            <Select value={cycleId ?? ""} onValueChange={(v) => setCycleId(v)}>
              <SelectTrigger className="h-11 w-full rounded-xl md:w-[340px]">
                <SelectValue placeholder="Escolha um ciclo" />
              </SelectTrigger>
              <SelectContent>
                {cycles.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {cycleLabel(c)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {selected ? (
              <Badge className="h-11 justify-center rounded-xl bg-[color:var(--sinaxys-tint)] px-4 text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                {selected.status}
              </Badge>
            ) : null}
          </div>
        </div>

        {!selected ? (
          <div className="mt-5 rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Nenhum ciclo disponível.</div>
        ) : null}
      </Card>

      {/* OKRs do ano (área separada para objetivos estratégicos) */}
      {selected?.type === "QUARTERLY" ? (
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">OKRs do ano ({currentYear})</div>
              <p className="mt-1 text-sm text-muted-foreground">Objetivos estratégicos que organizam o ano (empresa) + KRs.</p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              {isAdminish ? (
                <Button
                  className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                  onClick={() => {
                    resetObjective();
                    setCreatingAnnualObjective(true);
                    setObjLevel("COMPANY");
                    setObjDept(null);
                    setObjParent(null);
                    setObjOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Novo objetivo do ano
                </Button>
              ) : null}

              {historyAnnualCycle ? (
                <Button
                  variant="outline"
                  className="h-11 rounded-xl bg-white"
                  onClick={() => setReplicateOpen(true)}
                  disabled={replicating}
                  title="Replicar OKRs do ano selecionado no histórico para o ano corrente"
                >
                  Replicar do ano {historyAnnualCycle.year}
                </Button>
              ) : null}
            </div>
          </div>

          {!currentAnnualCycle ? (
            <div className="mt-4 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">
              Nenhum ciclo anual encontrado para {currentYear}. Ele será criado automaticamente ao replicar ou ao criar um objetivo estratégico.
            </div>
          ) : null}

          <Separator className="my-5" />

          <div className="grid gap-3">
            {(annualObjectives.filter((o) => o.level === "COMPANY") ?? []).length ? (
              annualObjectives
                .filter((o) => o.level === "COMPANY")
                .map((o) => {
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
                Nenhum objetivo estratégico (Empresa) no ano {currentYear}.
              </div>
            )}
          </div>

          {/* Histórico */}
          {previousAnnualCycles.length ? (
            <>
              <Separator className="my-5" />
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Histórico — anos anteriores</div>
                  <p className="mt-1 text-sm text-muted-foreground">Navegue nos OKRs anuais antigos (inativos) e replique para o ano corrente.</p>
                </div>

                <div className="flex w-full flex-col gap-2 md:w-auto md:flex-row md:items-center">
                  <Select value={historyAnnualCycleId ?? ""} onValueChange={(v) => setHistoryAnnualCycleId(v)}>
                    <SelectTrigger className="h-11 w-full rounded-xl md:w-[260px]">
                      <SelectValue placeholder="Escolha o ano" />
                    </SelectTrigger>
                    <SelectContent>
                      {previousAnnualCycles.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.year}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {historyAnnualCycle ? (
                    <Button
                      className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                      onClick={() => setReplicateOpen(true)}
                      disabled={replicating}
                    >
                      Replicar {historyAnnualCycle.year} → {currentYear}
                    </Button>
                  ) : null}
                </div>
              </div>

              {historyAnnualCycle ? (
                <div className="mt-4 grid gap-2">
                  {historyObjectives.length ? (
                    historyObjectives
                      .filter((o) => o.level === "COMPANY")
                      .map((o) => (
                        <div
                          key={o.id}
                          className="flex items-center justify-between gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] px-4 py-3"
                        >
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center gap-2">
                              {levelBadge(o.level)}
                              <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{o.title}</div>
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">Ano {historyAnnualCycle.year} • {o.status}</div>
                          </div>
                          <Button asChild variant="outline" className="h-10 rounded-xl bg-white">
                            <Link to={`/okr/objetivos/${o.id}`}>Abrir</Link>
                          </Button>
                        </div>
                      ))
                  ) : (
                    <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Sem objetivos nesse ano.</div>
                  )}
                </div>
              ) : null}
            </>
          ) : null}
        </Card>
      ) : null}

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">
              {selected?.type === "QUARTERLY" ? `OKRs do trimestre (${cycleLabel(selected)})` : "Objetivos do ciclo"}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Ao criar um objetivo, conecte explicitamente a qual parte do propósito/visão ele serve.
            </p>
          </div>

          {isAdminish ? (
            <Button
              className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={!selected}
              onClick={() => {
                resetObjective();
                setCreatingAnnualObjective(false);
                setObjOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Novo objetivo do trimestre
            </Button>
          ) : null}
        </div>

        <Separator className="my-5" />

        <div className="grid gap-3">
          {(selected?.type === "QUARTERLY" ? objectives.filter((o) => o.level !== "COMPANY") : objectives).length ? (
            (selected?.type === "QUARTERLY" ? objectives.filter((o) => o.level !== "COMPANY") : objectives).map((o) => {
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
            <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Nenhum objetivo neste ciclo.</div>
          )}
        </div>
      </Card>

      <AlertDialog open={replicateOpen} onOpenChange={setReplicateOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Replicar OKRs?</AlertDialogTitle>
            <AlertDialogDescription>
              {historyAnnualCycle
                ? `Vamos copiar objetivos e KRs do ano ${historyAnnualCycle.year} para o ano corrente (${currentYear}). Isso não apaga nada do ano atual — apenas adiciona novos itens.`
                : "Selecione um ano no histórico para replicar."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={replicating}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={replicating || !historyAnnualCycle}
              onClick={async () => {
                if (!historyAnnualCycle) return;
                setReplicating(true);
                try {
                  await replicateAnnualOkrs(historyAnnualCycle.id);
                  toast({ title: "OKRs replicados", description: `Copiamos ${historyAnnualCycle.year} → ${currentYear}.` });
                } catch (e) {
                  toast({
                    title: "Não foi possível replicar",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                } finally {
                  setReplicating(false);
                  setReplicateOpen(false);
                }
              }}
            >
              Replicar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog
        open={cycleOpen}
        onOpenChange={(v) => {
          setCycleOpen(v);
          if (!v) resetCycle();
        }}
      >
        <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Novo ciclo</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select value={cycleType} onValueChange={(v) => setCycleType(v as CycleType)}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="QUARTERLY">Trimestral</SelectItem>
                  <SelectItem value="ANNUAL">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Ano</Label>
              <Input className="h-11 rounded-xl" type="number" value={cycleYear} onChange={(e) => setCycleYear(Number(e.target.value))} />
            </div>

            {cycleType === "QUARTERLY" ? (
              <div className="grid gap-2">
                <Label>Trimestre</Label>
                <Select value={String(cycleQuarter)} onValueChange={(v) => setCycleQuarter(Number(v) as any)}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Q1</SelectItem>
                    <SelectItem value="2">Q2</SelectItem>
                    <SelectItem value="3">Q3</SelectItem>
                    <SelectItem value="4">Q4</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label>Status</Label>
              <Select value={cycleStatus} onValueChange={(v) => setCycleStatus(v as CycleStatus)}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PLANNING">PLANNING</SelectItem>
                  <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  <SelectItem value="CLOSED">CLOSED</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Nome (opcional)</Label>
              <Input className="h-11 rounded-xl" value={cycleName} onChange={(e) => setCycleName(e.target.value)} placeholder="Ex.: Sprint Estratégico" />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setCycleOpen(false)} disabled={cycleSaving}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={cycleSaving}
              onClick={async () => {
                if (cycleSaving) return;
                setCycleSaving(true);
                try {
                  const c = await createOkrCycle(cid, {
                    type: cycleType,
                    year: cycleYear,
                    quarter: cycleType === "QUARTERLY" ? cycleQuarter : null,
                    start_date: null,
                    end_date: null,
                    status: cycleStatus,
                    name: cycleName.trim() || null,
                  });
                  await qc.invalidateQueries({ queryKey: ["okr-cycles", cid] });
                  setCycleId(c.id);
                  toast({ title: "Ciclo criado" });
                  setCycleOpen(false);
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

      <Dialog
        open={objOpen}
        onOpenChange={(v) => {
          setObjOpen(v);
          if (!v) {
            setCreatingAnnualObjective(false);
            resetObjective();
          }
        }}
      >
        <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingObjectiveId ? "Editar objetivo" : creatingAnnualObjective ? "Novo objetivo do ano" : "Novo objetivo do ciclo"}
            </DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Nível</Label>
              <Select value={objLevel} onValueChange={(v) => setObjLevel(v as ObjectiveLevel)}>
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
              <Label>Atingimento esperado (%)</Label>
              <Input className="h-11 rounded-xl" value={objExpected} onChange={(e) => setObjExpected(e.target.value)} placeholder="80" />
              <div className="text-xs text-muted-foreground">Ex.: 70–85% costuma ser meta realista para objetivos aspiracionais.</div>
            </div>

            <div className="grid gap-2">
              <Label>Descrição (opcional)</Label>
              <Textarea className="min-h-[92px] rounded-2xl" value={objDesc} onChange={(e) => setObjDesc(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label>Motivo estratégico (opcional)</Label>
              <Textarea className="min-h-[92px] rounded-2xl" value={objReason} onChange={(e) => setObjReason(e.target.value)} />
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Dono responsável</Label>
                <Select value={objOwner} onValueChange={(v) => setObjOwner(v)}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {(p.name ?? p.email) + (p.role ? ` (${p.role})` : "")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>Departamento (opcional)</Label>
                <Select
                  value={objDept ?? ""}
                  onValueChange={(v) => {
                    setObjDept(v === SELECT_NONE ? null : v);
                  }}
                >
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Sem departamento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_NONE}>Sem departamento</SelectItem>
                    {departments.map((d) => (
                      <SelectItem key={d.id} value={d.id}>
                        {d.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {requiresBusinessCase && okrRoiEnabled ? (
              <div className="mt-4 rounded-3xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4">
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Impacto financeiro + ROI</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  {objLevel === "COMPANY"
                    ? "Para objetivos de Empresa, o custo é estimado pela média de custo/h dos colaboradores do time participante."
                    : "Para objetivos de departamento, o ROI usa seu custo/h (cadastre em Custos)."}
                </p>

                <div className="mt-4 grid gap-3 md:grid-cols-2">
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
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label>Objetivo pai (alinhamento opcional)</Label>
              <Select
                value={objParent ?? ""}
                onValueChange={(v) => {
                  setObjParent(v === SELECT_NONE ? null : v);
                }}
              >
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Sem objetivo pai" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_NONE}>Sem objetivo pai</SelectItem>
                  {objectives
                    .filter((o) => o.id !== objParent)
                    .map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.title}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              <div className="text-xs text-muted-foreground">Use isso para manter alinhamento entre objetivos (ex.: time → empresa).</div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setObjOpen(false)} disabled={objSaving}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={
                objSaving ||
                !selected ||
                objTitle.trim().length < 6 ||
                !businessCaseOk ||
                expectedAtt === null
              }
              onClick={async () => {
                if (!selected || objSaving) return;
                setObjSaving(true);
                try {
                  if (editingObjectiveId) {
                    await updateOkrObjective(editingObjectiveId, {
                      level: objLevel,
                      parent_objective_id: objParent,
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
                    toast({ title: "Objetivo atualizado" });
                  } else {
                    const createCycleId =
                      objLevel === "COMPANY"
                        ? (currentAnnualCycle?.id ?? (await ensureCurrentAnnualCycle()))
                        : selected.id;

                    await createOkrObjective({
                      company_id: cid,
                      cycle_id: createCycleId,
                      parent_objective_id: objParent,
                      strategy_objective_id: null,
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
                    toast({ title: "Objetivo criado" });
                  }

                  await qc.invalidateQueries({ queryKey: ["okr-objectives", cid, cycleId] });
                  if (currentAnnualCycle?.id) await qc.invalidateQueries({ queryKey: ["okr-objectives", cid, currentAnnualCycle.id] });
                  await qc.invalidateQueries({ queryKey: ["okr-kr-stats", cid] });
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