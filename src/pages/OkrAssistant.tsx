import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  KeyRound,
  ListChecks,
  Sparkles,
  Target,
  Users,
  Waypoints,
  Plus,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { listDepartments } from "@/lib/departmentsDb";
import { listProfilesByCompany, type DbProfile } from "@/lib/profilesDb";
import {
  createDeliverable,
  createKeyResult,
  createOkrObjective,
  createStrategyObjective,
  ensureOkrCycle,
  getCompanyFundamentals,
  listDeliverablesByKeyResultIds,
  listKeyResultsByObjectiveIds,
  listOkrCycles,
  listOkrObjectives,
  listStrategyObjectives,
  updateDeliverable,
  updateOkrObjective,
  updateStrategyObjective,
  upsertCompanyFundamentals,
  type DbCompanyFundamentals,
  type DbDeliverable,
  type DbOkrCycle,
  type DbOkrKeyResult,
  type DbOkrObjective,
  type DbStrategyObjective,
  type KrKind,
  type ObjectiveLevel,
  type WorkStatus,
} from "@/lib/okrDb";
import { linkObjectiveToKr } from "@/lib/okrAlignmentDb";
import { parseDescribedItems, serializeDescribedItems, type DescribedItem } from "@/lib/fundamentalsFormat";
import { getErrorMessage } from "@/lib/errorMessage";
import { 
  validateStrategyObjective,
  validateAnnualObjective,
  validateQuarterlyTier1Objective,
  validateQuarterlyTier2Objective,
  type ValidateStrategyObjectiveParams,
  type ValidateAnnualObjectiveParams,
  type ValidateQuarterlyTier1ObjectiveParams,
  type ValidateQuarterlyTier2ObjectiveParams,
} from "@/lib/okrValidation";

import { OkrPageHeader } from "@/components/OkrPageHeader";
import { OkrSubnav } from "@/components/OkrSubnav";

type StepId = 1 | 2 | 3 | 4 | 5 | 6 | 7;

type DraftKr =
  | {
      title: string;
      kind: "METRIC";
      metric_unit: string;
      start_value: string;
      target_value: string;
    }
  | {
      title: string;
      kind: "DELIVERABLE";
    };

type DraftObjective = {
  title: string;
  description: string;
  krs: DraftKr[];
  // Alignment
  alignToKrId: string;
};

type DraftTacticalObjective = DraftObjective & {
  departmentId: string;
  ownerUserId: string;
};

type DraftDeliverable = {
  keyResultId: string;
  title: string;
  description: string;
  ownerUserId: string;
  dueAt: string;
  status: WorkStatus;
};

const SELECT_NONE = "__none__";

function clsx(...v: Array<string | false | null | undefined>) {
  return v.filter(Boolean).join(" ");
}

function cycleLabel(c: DbOkrCycle) {
  const base = c.type === "ANNUAL" ? `${c.year}` : `Q${c.quarter ?? "?"}/${c.year}`;
  return c.name?.trim() ? `${c.name} · ${base}` : base;
}

function tokenizePt(s: string) {
  const stop = new Set([
    "de",
    "do",
    "da",
    "dos",
    "das",
    "a",
    "o",
    "as",
    "os",
    "para",
    "por",
    "com",
    "em",
    "na",
    "no",
    "nas",
    "nos",
    "um",
    "uma",
    "e",
    "ou",
    "que",
    "ao",
    "à",
    "se",
    "ser",
    "estar",
    "ter",
  ]);

  return Array.from(
    new Set(
      s
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-z0-9\s-]/g, " ")
        .split(/\s+/)
        .map((w) => w.trim())
        .filter((w) => w.length >= 4 && !stop.has(w)),
    ),
  );
}

// Coerência aqui é apenas informativa. O vínculo (cascata) é criado automaticamente ao salvar.
function semanticCoherenceHint(parent: string, child: string) {
  const parentTrim = parent.trim();
  const childTrim = child.trim();

  if (!parentTrim || !childTrim) {
    return {
      kind: "note" as const,
      text: "Vínculo automático será criado ao salvar.",
    };
  }

  // Se ambos estão preenchidos, assumimos coerência suficiente para avançar.
  // A heurística de palavras-chave confundia usuários e não deve bloquear o fluxo.
  return {
    kind: "ok" as const,
    text: "Vínculo automático: este objetivo será salvo como dependente do anterior.",
  };
}

function StepHeader({
  title,
  subtitle,
  badge,
}: {
  title: string;
  subtitle: string;
  badge?: { label: string; icon?: React.ReactNode };
}) {
  return (
    <div className="grid gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-base font-semibold text-[color:var(--sinaxys-ink)] sm:text-lg">{title}</h2>
        {badge ? (
          <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] hover:bg-[color:var(--sinaxys-tint)]">
            <span className="mr-1 inline-flex items-center">{badge.icon}</span>
            {badge.label}
          </Badge>
        ) : null}
      </div>
      <p className="text-sm text-muted-foreground">{subtitle}</p>
    </div>
  );
}

function CoachCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Consultor</div>
          <div className="mt-1 text-sm font-semibold text-[color:var(--sinaxys-ink)]">{title}</div>
          <div className="mt-2 grid gap-1 text-sm text-muted-foreground">
            {lines.slice(0, 3).map((t, idx) => (
              <div key={idx} className="leading-relaxed">
                {t}
              </div>
            ))}
          </div>
        </div>
        <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
          <Sparkles className="h-5 w-5" />
        </div>
      </div>
    </Card>
  );
}

function WizardProgress({ step }: { step: StepId }) {
  const items = [
    { id: 1 as const, label: "Fundamentos" },
    { id: 2 as const, label: "Longo prazo" },
    { id: 3 as const, label: "Ano" },
    { id: 4 as const, label: "Trimestre" },
    { id: 5 as const, label: "Tático" },
    { id: 6 as const, label: "Entregáveis" },
    { id: 7 as const, label: "Mapa" },
  ];

  const pct = Math.round(((step - 1) / (items.length - 1)) * 100);

  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Progresso</div>
        <Badge className="rounded-full bg-[color:var(--sinaxys-bg)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-bg)]">
          Etapa {step}/7
        </Badge>
      </div>
      <Progress value={pct} className="mt-3 h-2.5 rounded-full bg-[color:var(--sinaxys-bg)]" />
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
        {items.map((it) => {
          const active = it.id === step;
          const done = it.id < step;
          return (
            <div
              key={it.id}
              className={clsx(
                "rounded-2xl border p-2 text-center text-xs font-medium transition",
                active
                  ? "border-[color:var(--sinaxys-primary)] bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]"
                  : done
                    ? "border-[color:var(--sinaxys-border)] bg-white text-[color:var(--sinaxys-ink)]"
                    : "border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] text-muted-foreground",
              )}
            >
              {it.label}
            </div>
          );
        })}
      </div>
    </Card>
  );
}

export default function OkrAssistant() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { companyId } = useCompany();

  const cid = companyId ?? "";
  const hasCompany = !!companyId;

  const isAdminish = user?.role === "ADMIN" || user?.role === "HEAD" || user?.role === "MASTERADMIN";

  const [step, setStep] = useState<StepId>(1);

  // --- STEP 1: Fundamentals ---
  const qFund = useQuery({
    queryKey: ["okr-fundamentals", cid],
    enabled: hasCompany,
    queryFn: () => getCompanyFundamentals(cid),
  });

  const fundFromDb = qFund.data;

  const [fundPurpose, setFundPurpose] = useState("");
  const [fundMission, setFundMission] = useState("");
  const [fundVision, setFundVision] = useState("");
  const [fundValues, setFundValues] = useState("");
  const [fundCulture, setFundCulture] = useState("");
  const [fundValuesItems, setFundValuesItems] = useState<DescribedItem[]>([]);
  const [fundCultureItems, setFundCultureItems] = useState<DescribedItem[]>([]);
  const [valuesImport, setValuesImport] = useState("");
  const [cultureImport, setCultureImport] = useState("");
  const [fundSaved, setFundSaved] = useState(false);
  const [fundSaving, setFundSaving] = useState(false);

  useEffect(() => {
    setFundPurpose((fundFromDb?.purpose ?? "").trim());
    setFundMission((fundFromDb?.mission ?? "").trim());
    setFundVision((fundFromDb?.vision ?? "").trim());

    const valuesRaw = (fundFromDb?.values ?? "").trim();
    const cultureRaw = (fundFromDb?.culture ?? "").trim();

    setFundValues(valuesRaw);
    setFundCulture(cultureRaw);
    setFundValuesItems(parseDescribedItems(valuesRaw));
    setFundCultureItems(parseDescribedItems(cultureRaw));

    const hasAny =
      !!(fundFromDb?.purpose ?? "").trim() ||
      !!(fundFromDb?.mission ?? "").trim() ||
      !!(fundFromDb?.vision ?? "").trim() ||
      !!(fundFromDb?.values ?? "").trim() ||
      !!(fundFromDb?.culture ?? "").trim();
    setFundSaved(hasAny);
  }, [fundFromDb?.culture, fundFromDb?.mission, fundFromDb?.purpose, fundFromDb?.values, fundFromDb?.vision]);

  const valuesOk =
    fundValuesItems.length >= 1 &&
    fundValuesItems.every((it) => (it.title ?? "").trim().length >= 3 || (it.description ?? "").trim().length >= 6);
  const cultureOk =
    fundCultureItems.length >= 1 &&
    fundCultureItems.every((it) => (it.title ?? "").trim().length >= 3 || (it.description ?? "").trim().length >= 6);

  const fundamentalsCanSave =
    fundPurpose.trim().length >= 12 && fundMission.trim().length >= 12 && fundVision.trim().length >= 12 && valuesOk && cultureOk;

  // --- STEP 2: Long-term direction (strategy_objectives) ---
  const qStrategy = useQuery({
    queryKey: ["okr-strategy-objectives", cid],
    enabled: hasCompany,
    queryFn: () => listStrategyObjectives(cid),
  });

  const strategyObjectives = qStrategy.data ?? [];
  const so10 = strategyObjectives.find((s) => s.horizon_years === 10) ?? null;
  const so5 = strategyObjectives.find((s) => s.horizon_years === 5) ?? null;
  const so2 = strategyObjectives.find((s) => s.horizon_years === 2) ?? null;

  const [so10Text, setSo10Text] = useState("");
  const [so5Text, setSo5Text] = useState("");
  const [so2Text, setSo2Text] = useState("");
  const [soSaved, setSoSaved] = useState(false);
  const [soSaving, setSoSaving] = useState(false);

  useEffect(() => {
    setSo10Text((so10?.title ?? "").trim());
    setSo5Text((so5?.title ?? "").trim());
    setSo2Text((so2?.title ?? "").trim());
    setSoSaved(!!(so10?.id && so5?.id && so2?.id));
  }, [so10?.id, so10?.title, so2?.id, so2?.title, so5?.id, so5?.title]);

  const coherence10to5 = useMemo(() => semanticCoherenceHint(so10Text, so5Text), [so10Text, so5Text]);
  const coherence5to2 = useMemo(() => semanticCoherenceHint(so5Text, so2Text), [so5Text, so2Text]);

  const longTermCanSave = so10Text.trim().length >= 18 && so5Text.trim().length >= 18 && so2Text.trim().length >= 18;

  // --- Cycles ---
  const qCycles = useQuery({
    queryKey: ["okr-cycles", cid],
    enabled: hasCompany,
    queryFn: () => listOkrCycles(cid),
  });

  const cycles = qCycles.data ?? [];

  // --- STEP 3: Annual strategic objectives ---
  const [annualYear, setAnnualYear] = useState(() => String(new Date().getFullYear()));
  const [annualCycleId, setAnnualCycleId] = useState<string>("");
  const [annualDrafts, setAnnualDrafts] = useState<DraftObjective[]>([]);
  const [annualSaving, setAnnualSaving] = useState(false);
  const [annualModeratorId, setAnnualModeratorId] = useState<string>("");
  const [annualValidationErrors, setAnnualValidationErrors] = useState<string[]>([]);

  const annualCycles = useMemo(() => cycles.filter((c) => c.type === "ANNUAL"), [cycles]);

  useEffect(() => {
    const y = Number(annualYear);
    const found = annualCycles.find((c) => c.year === y)?.id ?? "";
    setAnnualCycleId(found);
  }, [annualCycles, annualYear]);

  const qAnnualObjectives = useQuery({
    queryKey: ["okr-annual-objectives", cid, annualCycleId],
    enabled: hasCompany && !!annualCycleId,
    queryFn: () => listOkrObjectives(cid, annualCycleId),
  });

  const annualObjectives = useMemo(() => {
    const all = qAnnualObjectives.data ?? [];
    return all.filter((o) => o.level === "COMPANY");
  }, [qAnnualObjectives.data]);

  const qAnnualKrs = useQuery({
    queryKey: ["okr-annual-krs", annualObjectives.map((o) => o.id).join(",")],
    enabled: annualObjectives.length > 0,
    queryFn: () => listKeyResultsByObjectiveIds(annualObjectives.map((o) => o.id)),
  });

  const annualKrs = qAnnualKrs.data ?? [];

  const annualKrCountsByObjective = useMemo(() => {
    const map = new Map<string, number>();
    for (const kr of annualKrs) map.set(kr.objective_id, (map.get(kr.objective_id) ?? 0) + 1);
    return map;
  }, [annualKrs]);

  // --- STEP 4: Quarterly strategic objectives (aligned to annual KRs) ---
  const [qYear, setQYear] = useState(() => String(new Date().getFullYear()));
  const [qQuarter, setQQuarter] = useState<"1" | "2" | "3" | "4">("1");
  const [quarterCycleId, setQuarterCycleId] = useState<string>("");
  const [quarterDrafts, setQuarterDrafts] = useState<DraftObjective[]>([]);
  const [quarterSaving, setQuarterSaving] = useState(false);

  const quarterlyCycles = useMemo(() => cycles.filter((c) => c.type === "QUARTERLY"), [cycles]);

  useEffect(() => {
    const y = Number(qYear);
    const q = Number(qQuarter);
    const found = quarterlyCycles.find((c) => c.year === y && c.quarter === q)?.id ?? "";
    setQuarterCycleId(found);
  }, [qQuarter, qYear, quarterlyCycles]);

  const qQuarterObjectives = useQuery({
    queryKey: ["okr-quarter-objectives", cid, quarterCycleId],
    enabled: hasCompany && !!quarterCycleId,
    queryFn: () => listOkrObjectives(cid, quarterCycleId),
  });

  const quarterObjectives = useMemo(() => (qQuarterObjectives.data ?? []).filter((o) => o.level === "COMPANY"), [qQuarterObjectives.data]);

  const qQuarterKrs = useQuery({
    queryKey: ["okr-quarter-krs", quarterObjectives.map((o) => o.id).join(",")],
    enabled: quarterObjectives.length > 0,
    queryFn: () => listKeyResultsByObjectiveIds(quarterObjectives.map((o) => o.id)),
  });
  const quarterKrs = qQuarterKrs.data ?? [];

  // --- STEP 5: Tactical objectives (by department, aligned to quarterly strategic KRs) ---
  const qDepts = useQuery({
    queryKey: ["okr-departments", cid],
    enabled: hasCompany,
    queryFn: () => listDepartments(cid),
  });

  const departments = qDepts.data ?? [];

  const qProfiles = useQuery({
    queryKey: ["okr-profiles", cid],
    enabled: hasCompany,
    queryFn: () => listProfilesByCompany(cid),
  });

  const profiles = qProfiles.data ?? [];

  const [tacticalDrafts, setTacticalDrafts] = useState<DraftTacticalObjective[]>([]);
  const [tacticalSaving, setTacticalSaving] = useState(false);

  const tacticalObjectives = useMemo(() => {
    const all = qQuarterObjectives.data ?? [];
    return all.filter((o) => o.level === "DEPARTMENT");
  }, [qQuarterObjectives.data]);

  const qTacticalKrs = useQuery({
    queryKey: ["okr-tactical-krs", tacticalObjectives.map((o) => o.id).join(",")],
    enabled: tacticalObjectives.length > 0,
    queryFn: () => listKeyResultsByObjectiveIds(tacticalObjectives.map((o) => o.id)),
  });
  const tacticalKrs = qTacticalKrs.data ?? [];

  // --- STEP 6: Individual deliverables inside tactical KRs ---
  const [deliverableDrafts, setDeliverableDrafts] = useState<DraftDeliverable[]>([]);
  const [deliverablesSaving, setDeliverablesSaving] = useState(false);

  const qExistingDeliverables = useQuery({
    queryKey: ["okr-tactical-deliverables", tacticalKrs.map((k) => k.id).join(",")],
    enabled: tacticalKrs.length > 0,
    queryFn: () => listDeliverablesByKeyResultIds(tacticalKrs.map((k) => k.id)),
  });

  const existingDeliverables = qExistingDeliverables.data ?? [];

  // --- gating ---
  const canGoStep2 = fundSaved;
  const canGoStep3 = soSaved;

  const annualReady = useMemo(() => {
    if (!annualCycleId) return false;
    if (!so2?.id) return false;

    const targets = annualObjectives.filter((o) => o.strategy_objective_id === so2.id);
    if (!targets.length) return false;

    // Each annual objective should have 1-4 KRs.
    return targets.every((o) => {
      const n = annualKrCountsByObjective.get(o.id) ?? 0;
      return n >= 1 && n <= 4;
    });
  }, [annualCycleId, annualKrCountsByObjective, annualObjectives, so2?.id]);

  const quarterReady = useMemo(() => {
    if (!quarterCycleId) return false;
    if (!annualKrs.length) return false;

    // Each quarterly objective must be aligned to some annual KR.
    // We ensure this by requiring alignToKrId on drafts and creating link.
    // For existing objectives, we consider them ok if they have at least 2 KRs.
    if (!quarterObjectives.length) return false;

    const counts = new Map<string, number>();
    for (const kr of quarterKrs) counts.set(kr.objective_id, (counts.get(kr.objective_id) ?? 0) + 1);

    return quarterObjectives.every((o) => {
      const n = counts.get(o.id) ?? 0;
      return n >= 2 && n <= 4;
    });
  }, [annualKrs.length, quarterCycleId, quarterKrs, quarterObjectives.length, quarterObjectives]);

  const tacticalReady = useMemo(() => {
    if (!quarterCycleId) return false;
    if (!quarterKrs.length) return false;
    if (!tacticalObjectives.length) return false;

    const counts = new Map<string, number>();
    for (const kr of tacticalKrs) counts.set(kr.objective_id, (counts.get(kr.objective_id) ?? 0) + 1);

    return tacticalObjectives.every((o) => {
      const n = counts.get(o.id) ?? 0;
      return n >= 1;
    });
  }, [quarterCycleId, quarterKrs.length, tacticalKrs, tacticalObjectives.length, tacticalObjectives]);

  const deliverablesReady = useMemo(() => {
    // At least one deliverable created for the tactical layer.
    return existingDeliverables.length > 0;
  }, [existingDeliverables.length]);

  const onPrev = () => setStep((s) => (s > 1 ? ((s - 1) as StepId) : s));
  const onNext = () => setStep((s) => (s < 7 ? ((s + 1) as StepId) : s));

  if (!user) return null;

  if (!hasCompany) {
    return (
      <div className="grid gap-6">
        <OkrSubnav />
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-sm text-muted-foreground">Aguardando identificação da empresa do seu usuário…</div>
        </Card>
      </div>
    );
  }

  if (!isAdminish) {
    return (
      <div className="grid gap-6">
        <OkrSubnav />
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Assistente estratégico</div>
          <p className="mt-1 text-sm text-muted-foreground">Este fluxo é voltado para admins (definição e governança de estratégia).</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <OkrSubnav />

      <OkrPageHeader
        title="Assistente estratégico (OKRs + Fundamentos)"
        subtitle="Um fluxo guiado para estruturar fundamentos, direção e execução com alinhamento automático."
      />

      <WizardProgress step={step} />

      {/* STEP CONTENT */}
      {step === 1 ? (
        <div className="grid gap-6">
          <StepHeader
            title="Etapa 1 — Fundamentos da empresa"
            subtitle="Vamos construir a base cultural e estratégica. Sem isso, o restante vira execução desconexa."
            badge={{ label: "Base", icon: <Target className="h-3.5 w-3.5" /> }}
          />

          <CoachCard
            title="Como usar esta etapa"
            lines={[
              "Fundamentos são a âncora: eles definem o 'porquê', o 'como' e o 'pra quê' da empresa.",
              "Eu vou explicar rapidamente cada item e em seguida pedir o preenchimento.",
              "Você só avança depois de salvar — isso evita 'pular base'.",
            ]}
          />

          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="grid gap-5">
              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Propósito</div>
                  <Badge className="rounded-full bg-[color:var(--sinaxys-bg)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-bg)]">
                    por quê existimos
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  O propósito é a razão de existir da empresa — o impacto que ela busca deixar no mundo.
                </p>
                <p className="text-xs text-muted-foreground">Ex.: "Democratizar acesso a educação de qualidade."</p>
                <Textarea className="min-h-[92px] rounded-2xl" value={fundPurpose} onChange={(e) => setFundPurpose(e.target.value)} />
              </div>

              <Separator />

              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Missão</div>
                  <Badge className="rounded-full bg-[color:var(--sinaxys-bg)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-bg)]">
                    o que fazemos
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  A missão traduz o propósito em ação — o que vocês fazem hoje para gerar o impacto.
                </p>
                <p className="text-xs text-muted-foreground">Ex.: "Ajudar PMEs a vender melhor com automação simples."</p>
                <Textarea className="min-h-[92px] rounded-2xl" value={fundMission} onChange={(e) => setFundMission(e.target.value)} />
              </div>

              <Separator />

              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Visão</div>
                  <Badge className="rounded-full bg-[color:var(--sinaxys-bg)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-bg)]">
                    onde queremos chegar
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">A visão descreve o futuro desejado — o "norte" de longo prazo.</p>
                <p className="text-xs text-muted-foreground">Ex.: "Ser a plataforma nº1 de … na América Latina."</p>
                <Textarea className="min-h-[92px] rounded-2xl" value={fundVision} onChange={(e) => setFundVision(e.target.value)} />
              </div>

              <Separator />

              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Valores</div>
                  <Badge className="rounded-full bg-[color:var(--sinaxys-bg)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-bg)]">
                    como decidimos
                  </Badge>
                  <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] hover:bg-[color:var(--sinaxys-tint)]">
                    {fundValuesItems.length} itens
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Valores são princípios de decisão — o "filtro" para escolhas difíceis quando o custo de errar é alto.
                </p>
                <p className="text-xs text-muted-foreground">Ex.: "Foco no cliente", "Franqueza com respeito", "Alta barra".</p>

                <div className="grid gap-3">
                  {fundValuesItems.length ? (
                    fundValuesItems.map((it, idx) => (
                      <div key={idx} className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="grid gap-2">
                                <Label className="text-xs">Valor</Label>
                                <Input
                                  className="h-11 rounded-xl"
                                  value={it.title}
                                  onChange={(e) =>
                                    setFundValuesItems((arr) =>
                                      arr.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x)),
                                    )
                                  }
                                  placeholder="Ex.: Clareza radical"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label className="text-xs">Como isso aparece no dia a dia (opcional)</Label>
                                <Input
                                  className="h-11 rounded-xl"
                                  value={it.description}
                                  onChange={(e) =>
                                    setFundValuesItems((arr) =>
                                      arr.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)),
                                    )
                                  }
                                  placeholder="Ex.: decisões por escrito, sem ruído"
                                />
                              </div>
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            className="h-9 rounded-xl text-muted-foreground hover:bg-[color:var(--sinaxys-bg)]"
                            onClick={() => setFundValuesItems((arr) => arr.filter((_, i) => i !== idx))}
                            title="Remover"
                          >
                            Remover
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">
                      Adicione seus valores como itens (fica mais legível do que um texto corrido).
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 rounded-2xl bg-white"
                      onClick={() => setFundValuesItems((arr) => [...arr, { title: "", description: "" }])}
                    >
                      + Adicionar valor
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 rounded-2xl bg-white"
                      disabled={!valuesImport.trim()}
                      onClick={() => {
                        const parsed = parseDescribedItems(valuesImport);
                        if (!parsed.length) return;
                        setFundValuesItems(parsed);
                        setValuesImport("");
                      }}
                    >
                      Importar colagem
                    </Button>
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-xs">Colar aqui (aceita lista ou JSON — converte automaticamente)</Label>
                    <Textarea
                      className="min-h-[84px] rounded-2xl"
                      value={valuesImport}
                      onChange={(e) => setValuesImport(e.target.value)}
                      placeholder={'Ex.:\n- Foco no cliente — Decidir pelo impacto no cliente\n- Clareza radical\n\n(ou cole o JSON se já tiver)'}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="grid gap-2">
                <div className="flex items-center gap-2">
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Cultura</div>
                  <Badge className="rounded-full bg-[color:var(--sinaxys-bg)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-bg)]">
                    como trabalhamos
                  </Badge>
                  <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] hover:bg-[color:var(--sinaxys-tint)]">
                    {fundCultureItems.length} itens
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Cultura é o comportamento padrão: como a empresa opera de verdade quando ninguém está olhando.
                </p>
                <p className="text-xs text-muted-foreground">Ex.: "Ritmo semanal", "Escrita antes de reunião", "Aprendizado contínuo".</p>

                <div className="grid gap-3">
                  {fundCultureItems.length ? (
                    fundCultureItems.map((it, idx) => (
                      <div key={idx} className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="grid gap-2 sm:grid-cols-2">
                              <div className="grid gap-2">
                                <Label className="text-xs">Comportamento / regra cultural</Label>
                                <Input
                                  className="h-11 rounded-xl"
                                  value={it.title}
                                  onChange={(e) =>
                                    setFundCultureItems((arr) =>
                                      arr.map((x, i) => (i === idx ? { ...x, title: e.target.value } : x)),
                                    )
                                  }
                                  placeholder="Ex.: Menos discurso, mais entrega"
                                />
                              </div>
                              <div className="grid gap-2">
                                <Label className="text-xs">Como isso aparece (opcional)</Label>
                                <Input
                                  className="h-11 rounded-xl"
                                  value={it.description}
                                  onChange={(e) =>
                                    setFundCultureItems((arr) =>
                                      arr.map((x, i) => (i === idx ? { ...x, description: e.target.value } : x)),
                                    )
                                  }
                                  placeholder="Ex.: reuniões curtas, check-ins semanais"
                                />
                              </div>
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            className="h-9 rounded-xl text-muted-foreground hover:bg-[color:var(--sinaxys-bg)]"
                            onClick={() => setFundCultureItems((arr) => arr.filter((_, i) => i !== idx))}
                            title="Remover"
                          >
                            Remover
                          </Button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">
                      Descreva a cultura em comportamentos observáveis (itens). Isso ajuda a empresa a executar de forma consistente.
                    </div>
                  )}

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 rounded-2xl bg-white"
                      onClick={() => setFundCultureItems((arr) => [...arr, { title: "", description: "" }])}
                    >
                      + Adicionar item de cultura
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      className="h-11 rounded-2xl bg-white"
                      disabled={!cultureImport.trim()}
                      onClick={() => {
                        const parsed = parseDescribedItems(cultureImport);
                        if (!parsed.length) return;
                        setFundCultureItems(parsed);
                        setCultureImport("");
                      }}
                    >
                      Importar colagem
                    </Button>
                  </div>

                  <div className="grid gap-2">
                    <Label className="text-xs">Colar aqui (aceita lista ou JSON — converte automaticamente)</Label>
                    <Textarea
                      className="min-h-[84px] rounded-2xl"
                      value={cultureImport}
                      onChange={(e) => setCultureImport(e.target.value)}
                      placeholder={'Ex.:\n- Execução acima de intenção — Planejamento sem execução é ruído\n- Escrita antes de reunião\n\n(ou cole o JSON se já tiver)'}
                    />
                  </div>
                </div>
              </div>

              <Separator />

              <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">
                Empresas que revisam seus fundamentos periodicamente mantêm coerência cultural e estratégica. Recomendamos revisão a cada 2 anos.
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">
                  Para avançar: preencha todos os campos e clique em <span className="font-medium text-[color:var(--sinaxys-ink)]">Salvar fundamentos</span>.
                </div>
                <Button
                  className="h-11 rounded-2xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                  disabled={!fundamentalsCanSave || fundSaving}
                  onClick={async () => {
                    try {
                      setFundSaving(true);
                      const patch: Partial<DbCompanyFundamentals> = {
                        purpose: fundPurpose.trim() || null,
                        mission: fundMission.trim() || null,
                        vision: fundVision.trim() || null,
                        values: serializeDescribedItems(fundValuesItems) || null,
                        culture: serializeDescribedItems(fundCultureItems) || null,
                      };
                      await upsertCompanyFundamentals(cid, patch);
                      await qc.invalidateQueries({ queryKey: ["okr-fundamentals", cid] });
                      setFundSaved(true);
                      toast({ title: "Fundamentos salvos" });
                    } catch (e) {
                      toast({
                        title: "Não foi possível salvar",
                        description: getErrorMessage(e),
                        variant: "destructive",
                      });
                    } finally {
                      setFundSaving(false);
                    }
                  }}
                >
                  Salvar fundamentos
                  <CheckCircle2 className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {step === 2 ? (
        <div className="grid gap-6">
          <StepHeader
            title="Etapa 2 — Visão e objetivos de longo prazo"
            subtitle="Agora vamos transformar fundamentos em direção: 10 anos → 5 anos → 2 anos."
            badge={{ label: "Direção", icon: <Waypoints className="h-3.5 w-3.5" /> }}
          />

          <CoachCard
            title="Visão vs objetivo (em 10s)"
            lines={[
              "Visão é imagem de futuro (qual posição/realidade queremos ver).",
              "Objetivo é um resultado concreto (o que precisa ser verdade até lá).",
              "Vamos construir em cascata para manter coerência.",
            ]}
          />

          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="grid gap-5">
              <div className="grid gap-2">
                <Label>1) Visão de 10 anos</Label>
                <p className="text-sm text-muted-foreground">Como a empresa será percebida / qual realidade terá ajudado a criar?</p>
                <Input className="h-11 rounded-xl" value={so10Text} onChange={(e) => setSo10Text(e.target.value)} placeholder="Ex.: Ser referência em…" />
              </div>

              <Separator />

              <div className="grid gap-2">
                <Label>2) Objetivo de 5 anos</Label>
                <p className="text-sm text-muted-foreground">O que precisa ser verdade em 5 anos para sustentar a visão?</p>
                <Input className="h-11 rounded-xl" value={so5Text} onChange={(e) => setSo5Text(e.target.value)} placeholder="Ex.: Atingir … clientes / … receita / … presença" />
                <div
                  className={clsx(
                    "rounded-2xl border p-3 text-sm",
                    coherence10to5.kind === "ok"
                      ? "border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]"
                      : "border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]",
                  )}
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vínculo 10 → 5</div>
                  <div className="mt-1 text-sm text-[color:var(--sinaxys-ink)]">{coherence10to5.text}</div>
                </div>
              </div>

              <Separator />

              <div className="grid gap-2">
                <Label>3) Objetivo de 2 anos</Label>
                <p className="text-sm text-muted-foreground">Qual é o "degrau" de 2 anos que te coloca no trilho do objetivo de 5?</p>
                <Input className="h-11 rounded-xl" value={so2Text} onChange={(e) => setSo2Text(e.target.value)} placeholder="Ex.: Construir … / Atingir … / Expandir …" />
                <div
                  className={clsx(
                    "rounded-2xl border p-3 text-sm",
                    coherence5to2.kind === "ok"
                      ? "border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]"
                      : "border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]",
                  )}
                >
                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vínculo 5 → 2</div>
                  <div className="mt-1 text-sm text-[color:var(--sinaxys-ink)]">{coherence5to2.text}</div>
                </div>
              </div>

              <Separator />

              <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">
                Recomendamos revisão dos objetivos de longo prazo a cada 2 anos.
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">Dica: texto curto costuma gerar desalinhamento. Prefira frases completas.</div>
                <Button
                  className="h-11 rounded-2xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                  disabled={!longTermCanSave || soSaving}
                  onClick={async () => {
                    try {
                      setSoSaving(true);

                      const upsertOne = async (
                        existing: DbStrategyObjective | null,
                        horizon: 2 | 5 | 10,
                        title: string,
                        parentId: string | null,
                      ) => {
                        const trimmed = title.trim();
                        if (existing?.id) {
                          await updateStrategyObjective(existing.id, {
                            title: trimmed,
                            parent_strategy_objective_id: parentId,
                          });
                          return existing.id;
                        }
                        const created = await createStrategyObjective({
                          company_id: cid,
                          horizon_years: horizon,
                          title: trimmed,
                          parent_strategy_objective_id: parentId,
                          created_by_user_id: user.id,
                          owner_user_id: user.id,
                        });
                        return created.id;
                      };

                      // Cascata: 10 anos → 5 anos → 2 anos
                      const id10 = await upsertOne(so10, 10, so10Text, null);
                      const id5 = await upsertOne(so5, 5, so5Text, id10);
                      await upsertOne(so2, 2, so2Text, id5);

                      await qc.invalidateQueries({ queryKey: ["okr-strategy-objectives", cid] });
                      setSoSaved(true);
                      toast({ title: "Direção de longo prazo salva" });
                    } catch (e) {
                      toast({
                        title: "Não foi possível salvar",
                        description: getErrorMessage(e),
                        variant: "destructive",
                      });
                    } finally {
                      setSoSaving(false);
                    }
                  }}
                >
                  Salvar direção
                  <CheckCircle2 className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {step === 3 ? (
        <div className="grid gap-6">
          <StepHeader
            title="Etapa 3 — Objetivos estratégicos do ano"
            subtitle="Planejamento anual: até 5 objetivos estratégicos, cada um com 1 a 4 KRs."
            badge={{ label: "Ano", icon: <Target className="h-3.5 w-3.5" /> }}
          />

          <CoachCard
            title="Objetivo vs KR (em 10s)"
            lines={[
              "Objetivo: direção qualitativa (mudança que importa).",
              "KR: evidência quantitativa/observável de que a mudança aconteceu.",
              "Aqui, cada objetivo anual se conecta ao objetivo de 2 anos.",
            ]}
          />

          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Ano</Label>
                <div className="flex flex-wrap gap-2">
                  <Input className="h-11 w-[140px] rounded-xl" value={annualYear} onChange={(e) => setAnnualYear(e.target.value)} />
                  <Button
                    variant="outline"
                    className="h-11 rounded-2xl bg-white"
                    onClick={async () => {
                      const y = Number(annualYear);
                      if (!Number.isFinite(y) || y < 2000 || y > 2100) {
                        toast({ title: "Ano inválido", variant: "destructive" });
                        return;
                      }
                      try {
                        await ensureOkrCycle({ type: "ANNUAL", year: y, status: "ACTIVE", name: null });
                        await qc.invalidateQueries({ queryKey: ["okr-cycles", cid] });
                        toast({ title: "Ciclo anual garantido" });
                      } catch (e) {
                        toast({
                          title: "Não foi possível criar/encontrar o ciclo",
                          description: getErrorMessage(e),
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    Criar/garantir ciclo anual
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">O ciclo anual organiza o planejamento do ano e alimenta os trimestres.</div>
              </div>

              <Separator />

              <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4 text-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conexão obrigatória</div>
                <div className="mt-1 font-semibold text-[color:var(--sinaxys-ink)]">Objetivo de 2 anos</div>
                <div className="mt-1 text-sm text-muted-foreground">{so2?.title ?? "(crie na etapa 2)"}</div>
              </div>

              <Separator />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Objetivos existentes</div>
                  <div className="mt-1 text-sm text-muted-foreground">No ciclo selecionado.</div>
                </div>
                <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] hover:bg-[color:var(--sinaxys-tint)]">
                  {annualObjectives.length} objetivos
                </Badge>
              </div>

              <div className="grid gap-3">
                {annualObjectives.length ? (
                  annualObjectives.map((o) => {
                    const n = annualKrCountsByObjective.get(o.id) ?? 0;
                    return (
                      <Link
                        key={o.id}
                        to={`/okr/objetivos/${o.id}`}
                        className="block rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4 transition hover:bg-[color:var(--sinaxys-tint)]/30"
                        title="Abrir objetivo"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{o.title}</div>
                              <span className="hidden items-center gap-1 text-xs font-semibold text-[color:var(--sinaxys-primary)] sm:inline-flex">
                                Abrir <ArrowRight className="h-3.5 w-3.5" />
                              </span>
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">Conectado ao 2 anos: {o.strategy_objective_id === so2?.id ? "Sim" : "Não"}</div>
                          </div>
                          <Badge
                            className={clsx(
                              "rounded-full",
                              n >= 1 && n <= 4
                                ? "bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]"
                                : "bg-amber-100 text-amber-900",
                            )}
                          >
                            {n} KRs
                          </Badge>
                        </div>
                      </Link>
                    );
                  })
                ) : (
                  <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">
                    Nenhum objetivo anual ainda. Crie abaixo.
                  </div>
                )}
              </div>

              <Separator />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Criar objetivos do ano</div>
                  <div className="mt-1 text-sm text-muted-foreground">Até 5 objetivos. Cada um com 1–4 KRs.</div>
                </div>
                <Button
                  variant="outline"
                  className="h-11 rounded-2xl bg-white"
                  disabled={annualDrafts.length >= 5}
                  onClick={() =>
                    setAnnualDrafts((d) => [
                      ...d,
                      {
                        title: "",
                        description: "",
                        alignToKrId: SELECT_NONE,
                        krs: [
                          { title: "", kind: "METRIC", metric_unit: "", start_value: "", target_value: "" },
                          { title: "", kind: "METRIC", metric_unit: "", start_value: "", target_value: "" },
                        ],
                      },
                    ])
                  }
                >
                  Adicionar objetivo
                </Button>
              </div>

              <div className="grid gap-4">
                {annualDrafts.map((d, idx) => (
                  <div key={idx} className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Objetivo anual #{idx + 1}</div>
                      <Button
                        variant="ghost"
                        className="h-9 rounded-xl text-muted-foreground hover:bg-[color:var(--sinaxys-bg)]"
                        onClick={() => setAnnualDrafts((arr) => arr.filter((_, i) => i !== idx))}
                      >
                        Remover
                      </Button>
                    </div>

                    <div className="mt-4 grid gap-3">
                      <div className="grid gap-2">
                        <Label>Título</Label>
                        <Input
                          className="h-11 rounded-xl"
                          value={d.title}
                          onChange={(e) =>
                            setAnnualDrafts((arr) => arr.map((it, i) => (i === idx ? { ...it, title: e.target.value } : it)))
                          }
                          placeholder="Ex.: Aumentar retenção de clientes"
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label>Descrição (opcional)</Label>
                        <Textarea
                          className="min-h-[88px] rounded-2xl"
                          value={d.description}
                          onChange={(e) =>
                            setAnnualDrafts((arr) => arr.map((it, i) => (i === idx ? { ...it, description: e.target.value } : it)))
                          }
                          placeholder="Contexto, tese estratégica, restrições…"
                        />
                      </div>

                      <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">
                        Conexão visual: este objetivo anual será automaticamente conectado ao objetivo de 2 anos.
                      </div>

                      <div className="grid gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <Label>KRs (1 a 4)</Label>
                          <Button
                            variant="outline"
                            className="h-9 rounded-xl bg-white"
                            disabled={d.krs.length >= 4}
                            onClick={() =>
                              setAnnualDrafts((arr) =>
                                arr.map((it, i) =>
                                  i === idx
                                    ? {
                                        ...it,
                                        krs: [...it.krs, { title: "", kind: "DELIVERABLE" }],
                                      }
                                    : it,
                                ),
                              )
                            }
                          >
                            + KR
                          </Button>
                        </div>

                        <div className="grid gap-3">
                          {d.krs.map((kr, kIdx) => (
                            <div key={kIdx} className="rounded-2xl border border-[color:var(--sinaxys-border)] p-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">KR #{kIdx + 1}</div>
                                <Button
                                  variant="ghost"
                                  className="h-8 rounded-xl text-muted-foreground hover:bg-[color:var(--sinaxys-bg)]"
                                  onClick={() =>
                                    setAnnualDrafts((arr) =>
                                      arr.map((it, i) =>
                                        i === idx ? { ...it, krs: it.krs.filter((_, j) => j !== kIdx) } : it,
                                      ),
                                    )
                                  }
                                  disabled={d.krs.length <= 2}
                                >
                                  Remover
                                </Button>
                              </div>

                              <div className="mt-3 grid gap-2">
                                <Label>Título do KR</Label>
                                <Input
                                  className="h-11 rounded-xl"
                                  value={kr.title}
                                  onChange={(e) =>
                                    setAnnualDrafts((arr) =>
                                      arr.map((it, i) => {
                                        if (i !== idx) return it;
                                        const next = [...it.krs];
                                        next[kIdx] = { ...next[kIdx], title: e.target.value } as DraftKr;
                                        return { ...it, krs: next };
                                      }),
                                    )
                                  }
                                  placeholder="Ex.: reduzir churn de 8% para 5%"
                                />
                              </div>

                              <div className="mt-3 grid gap-2">
                                <Label>Tipo</Label>
                                <Select
                                  value={kr.kind}
                                  onValueChange={(v) =>
                                    setAnnualDrafts((arr) =>
                                      arr.map((it, i) => {
                                        if (i !== idx) return it;
                                        const next = [...it.krs];
                                        if (v === "METRIC") {
                                          next[kIdx] = { title: kr.title, kind: "METRIC", metric_unit: "", start_value: "", target_value: "" };
                                        } else {
                                          next[kIdx] = { title: kr.title, kind: "DELIVERABLE" };
                                        }
                                        return { ...it, krs: next };
                                      }),
                                    )
                                  }
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

                              {kr.kind === "METRIC" ? (
                                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                                  <div className="grid gap-2">
                                    <Label>Unidade</Label>
                                    <Input
                                      className="h-11 rounded-xl"
                                      value={kr.metric_unit}
                                      onChange={(e) =>
                                        setAnnualDrafts((arr) =>
                                          arr.map((it, i) => {
                                            if (i !== idx) return it;
                                            const next = [...it.krs];
                                            const cur = next[kIdx] as Extract<DraftKr, { kind: "METRIC" }>;
                                            next[kIdx] = { ...cur, metric_unit: e.target.value };
                                            return { ...it, krs: next };
                                          }),
                                        )
                                      }
                                      placeholder="% / R$ / #"
                                    />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label>Início</Label>
                                    <Input
                                      className="h-11 rounded-xl"
                                      value={kr.start_value}
                                      onChange={(e) =>
                                        setAnnualDrafts((arr) =>
                                          arr.map((it, i) => {
                                            if (i !== idx) return it;
                                            const next = [...it.krs];
                                            const cur = next[kIdx] as Extract<DraftKr, { kind: "METRIC" }>;
                                            next[kIdx] = { ...cur, start_value: e.target.value };
                                            return { ...it, krs: next };
                                          }),
                                        )
                                      }
                                      placeholder="0"
                                    />
                                  </div>
                                  <div className="grid gap-2">
                                    <Label>Meta</Label>
                                    <Input
                                      className="h-11 rounded-xl"
                                      value={kr.target_value}
                                      onChange={(e) =>
                                        setAnnualDrafts((arr) =>
                                          arr.map((it, i) => {
                                            if (i !== idx) return it;
                                            const next = [...it.krs];
                                            const cur = next[kIdx] as Extract<DraftKr, { kind: "METRIC" }>;
                                            next[kIdx] = { ...cur, target_value: e.target.value };
                                            return { ...it, krs: next };
                                          }),
                                        )
                                      }
                                      placeholder="100"
                                    />
                                  </div>
                                </div>
                              ) : null}
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">
                Revise os objetivos estratégicos do ano a cada trimestre.
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">Para avançar: tenha ao menos 1 objetivo anual conectado ao 2 anos, com 1–4 KRs.</div>
                <Button
                  className="h-11 rounded-2xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                  disabled={annualSaving || !annualCycleId || !so2?.id}
                  onClick={async () => {
                    if (!annualCycleId || !so2?.id) return;

                    const trimmed = annualDrafts
                      .map((o) => ({
                        ...o,
                        title: o.title.trim(),
                        description: o.description.trim(),
                        krs: o.krs
                          .map((k) => (k.kind === "METRIC" ? { ...k, title: k.title.trim(), metric_unit: k.metric_unit.trim() } : { ...k, title: k.title.trim() }))
                          .filter((k) => k.title.length >= 6),
                      }))
                      .filter((o) => o.title.length >= 6);

                    // Validações
                    const validationErrors: string[] = [];
                    
                    for (const o of trimmed) {
                      const result = validateAnnualObjective({
                        objective: {
                          id: "",
                          company_id: cid,
                          cycle_id: annualCycleId,
                          parent_objective_id: null,
                          strategy_objective_id: so2.id,
                          level: "COMPANY" as ObjectiveLevel,
                          department_id: null,
                          tier: null,
                          owner_user_id: user.id,
                          moderator_user_id: null,
                          title: o.title,
                          description: o.description || null,
                          strategic_reason: null,
                          linked_fundamental: null,
                          linked_fundamental_text: null,
                          due_at: null,
                          expected_attainment_pct: null,
                          estimated_value_brl: null,
                          estimated_effort_hours: null,
                          estimated_cost_brl: null,
                          estimated_roi_pct: null,
                          expected_profit_brl: null,
                          profit_thesis: null,
                          expected_revenue_at: null,
                          status: "ACTIVE",
                          achieved_pct: null,
                          achieved_at: null,
                          head_performance_score: null,
                          head_performance_notes: null,
                          head_performance_reviewed_at: null,
                          created_at: null,
                          updated_at: null,
                        },
                        krs: o.krs as any,
                        objectives2Year: strategyObjectives,
                        admins: profiles.filter(p => p.role === "ADMIN" || p.role === "MASTERADMIN"),
                        cycleType: "ANNUAL",
                      });

                      if (!result.valid) {
                        validationErrors.push(...result.errors.map(e => e.message));
                      }

                      // Validar contagem de KRs
                      if (o.krs.length < 1) {
                        validationErrors.push("Cada objetivo anual deve ter pelo menos 1 KR");
                      }
                      if (o.krs.length > 4) {
                        validationErrors.push("Cada objetivo anual pode ter no máximo 4 KRs");
                      }
                    }

                    if (validationErrors.length > 0) {
                      setAnnualValidationErrors(validationErrors);
                      toast({
                        title: "Erros de validação",
                        description: validationErrors.join(". "),
                        variant: "destructive",
                      });
                      return;
                    }

                    setAnnualValidationErrors([]);
                    setAnnualSaving(true);
                    try {
                      for (const o of trimmed) {
                        const created = await createOkrObjective({
                          company_id: cid,
                          cycle_id: annualCycleId,
                          parent_objective_id: null,
                          strategy_objective_id: so2.id,
                          level: "COMPANY" as ObjectiveLevel,
                          department_id: null,
                          tier: null,
                          owner_user_id: user.id,
                          moderator_user_id: annualModeratorId || null,
                          title: o.title,
                          description: o.description || null,
                          strategic_reason: null,
                          linked_fundamental: null,
                          linked_fundamental_text: null,
                          due_at: null,
                          expected_attainment_pct: null,
                          estimated_value_brl: null,
                          estimated_effort_hours: null,
                          estimated_cost_brl: null,
                          estimated_roi_pct: null,
                          expected_profit_brl: null,
                          profit_thesis: null,
                          expected_revenue_at: null,
                        });

                        for (const kr of o.krs) {
                          const kind = kr.kind as KrKind;
                          const start = kind === "METRIC" ? Number(String((kr as Extract<DraftKr, { kind: "METRIC" }>).start_value).replace(",", ".")) : null;
                          const target = kind === "METRIC" ? Number(String((kr as Extract<DraftKr, { kind: "METRIC" }>).target_value).replace(",", ".")) : null;

                          await createKeyResult({
                            objective_id: created.id,
                            title: kr.title,
                            kind,
                            due_at: null,
                            achieved: false,
                            metric_unit: kind === "METRIC" ? (kr as Extract<DraftKr, { kind: "METRIC" }>).metric_unit || null : null,
                            start_value: kind === "METRIC" && Number.isFinite(start) ? start : null,
                            current_value: kind === "METRIC" && Number.isFinite(start) ? start : null,
                            target_value: kind === "METRIC" && Number.isFinite(target) ? target : null,
                            owner_user_id: user.id,
                            confidence: "ON_TRACK",
                          });
                        }
                      }

                      setAnnualDrafts([]);
                      setAnnualModeratorId("");
                      await qc.invalidateQueries({ queryKey: ["okr-annual-objectives", cid, annualCycleId] });
                      await qc.invalidateQueries({ queryKey: ["okr-annual-krs", annualObjectives.map((o) => o.id).join(",")] });

                      toast({ title: "Planejamento anual salvo" });
                    } catch (e) {
                      toast({
                        title: "Não foi possível salvar",
                        description: getErrorMessage(e),
                        variant: "destructive",
                      });
                    } finally {
                      setAnnualSaving(false);
                    }
                  }}
                >
                  Salvar objetivos do ano
                  <CheckCircle2 className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {step === 4 ? (
        <div className="grid gap-6">
          <StepHeader
            title="Etapa 4 — OKRs estratégicos trimestrais"
            subtitle="O trimestre é execução estratégica: mudanças relevantes no negócio."
            badge={{ label: "Trimestre", icon: <KeyRound className="h-3.5 w-3.5" /> }}
          />

          <CoachCard
            title="Estratégico (neste trimestre)"
            lines={[
              "Estratégico = mudança que move o negócio (não apenas 'manter a operação').",
              "Aqui, cada objetivo trimestral se conecta a um KR anual.",
              "Governança: revisão mensal e acompanhamento semanal dos KRs.",
            ]}
          />

          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="grid gap-4">
              <div className="grid gap-2">
                <Label>Ciclo do trimestre</Label>
                <div className="flex flex-wrap gap-2">
                  <Input className="h-11 w-[140px] rounded-xl" value={qYear} onChange={(e) => setQYear(e.target.value)} />
                  <Select value={qQuarter} onValueChange={(v) => setQQuarter(v as any)}>
                    <SelectTrigger className="h-11 w-[160px] rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-2xl">
                      <SelectItem value="1">Q1</SelectItem>
                      <SelectItem value="2">Q2</SelectItem>
                      <SelectItem value="3">Q3</SelectItem>
                      <SelectItem value="4">Q4</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    className="h-11 rounded-2xl bg-white"
                    onClick={async () => {
                      const y = Number(qYear);
                      const q = Number(qQuarter);
                      if (!Number.isFinite(y) || y < 2000 || y > 2100) {
                        toast({ title: "Ano inválido", variant: "destructive" });
                        return;
                      }
                      try {
                        await ensureOkrCycle({ type: "QUARTERLY", year: y, quarter: q, status: "ACTIVE", name: null });
                        await qc.invalidateQueries({ queryKey: ["okr-cycles", cid] });
                        toast({ title: "Trimestre garantido" });
                      } catch (e) {
                        toast({
                          title: "Não foi possível criar/encontrar o trimestre",
                          description: getErrorMessage(e),
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    Criar/garantir trimestre
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4 text-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Vínculo obrigatório</div>
                <div className="mt-1 text-sm text-muted-foreground">
                  Objetivos do trimestre devem se conectar aos <span className="font-medium text-[color:var(--sinaxys-ink)]">KRs anuais</span>.
                </div>
              </div>

              <Separator />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Criar objetivos estratégicos do trimestre</div>
                  <div className="mt-1 text-sm text-muted-foreground">Cada um com 2–4 KRs e alinhamento a um KR anual.</div>
                </div>
                <Button
                  variant="outline"
                  className="h-11 rounded-2xl bg-white"
                  onClick={() =>
                    setQuarterDrafts((d) => [
                      ...d,
                      {
                        title: "",
                        description: "",
                        alignToKrId: SELECT_NONE,
                        krs: [
                          { title: "", kind: "METRIC", metric_unit: "", start_value: "", target_value: "" },
                          { title: "", kind: "METRIC", metric_unit: "", start_value: "", target_value: "" },
                        ],
                      },
                    ])
                  }
                >
                  Adicionar objetivo
                </Button>
              </div>

              {!annualKrs.length ? (
                <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">
                  Você ainda não tem KRs anuais para conectar. Conclua a etapa 3.
                </div>
              ) : null}

              <div className="grid gap-4">
                {quarterDrafts.map((d, idx) => (
                  <div key={idx} className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Objetivo trimestral #{idx + 1}</div>
                      <Button
                        variant="ghost"
                        className="h-9 rounded-xl text-muted-foreground hover:bg-[color:var(--sinaxys-bg)]"
                        onClick={() => setQuarterDrafts((arr) => arr.filter((_, i) => i !== idx))}
                      >
                        Remover
                      </Button>
                    </div>

                    <div className="mt-4 grid gap-3">
                      <div className="grid gap-2">
                        <Label>Título</Label>
                        <Input
                          className="h-11 rounded-xl"
                          value={d.title}
                          onChange={(e) => setQuarterDrafts((arr) => arr.map((it, i) => (i === idx ? { ...it, title: e.target.value } : it)))}
                          placeholder="Ex.: Acelerar ativação no onboarding"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label>Alinhar ao KR anual</Label>
                        <Select value={d.alignToKrId} onValueChange={(v) => setQuarterDrafts((arr) => arr.map((it, i) => (i === idx ? { ...it, alignToKrId: v } : it)))}>
                          <SelectTrigger className="h-11 rounded-xl bg-white">
                            <SelectValue placeholder="Selecione um KR anual" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            <SelectItem value={SELECT_NONE}>Selecione…</SelectItem>
                            {annualKrs.map((kr) => (
                              <SelectItem key={kr.id} value={kr.id}>
                                {kr.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="text-xs text-muted-foreground">Isso cria o vínculo visual (KR anual → objetivo do trimestre).</div>
                      </div>

                      <div className="grid gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <Label>KRs do trimestre (2 a 4)</Label>
                          <Button
                            variant="outline"
                            className="h-9 rounded-xl bg-white"
                            disabled={d.krs.length >= 4}
                            onClick={() =>
                              setQuarterDrafts((arr) =>
                                arr.map((it, i) => (i === idx ? { ...it, krs: [...it.krs, { title: "", kind: "DELIVERABLE" }] } : it)),
                              )
                            }
                          >
                            + KR
                          </Button>
                        </div>

                        <div className="grid gap-3">
                          {d.krs.map((kr, kIdx) => (
                            <div key={kIdx} className="rounded-2xl border border-[color:var(--sinaxys-border)] p-4">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">KR #{kIdx + 1}</div>
                                <Button
                                  variant="ghost"
                                  className="h-8 rounded-xl text-muted-foreground hover:bg-[color:var(--sinaxys-bg)]"
                                  onClick={() =>
                                    setQuarterDrafts((arr) =>
                                      arr.map((it, i) => (i === idx ? { ...it, krs: it.krs.filter((_, j) => j !== kIdx) } : it)),
                                    )
                                  }
                                  disabled={d.krs.length <= 2}
                                >
                                  Remover
                                </Button>
                              </div>
                              <div className="mt-3 grid gap-2">
                                <Label>Título do KR</Label>
                                <Input
                                  className="h-11 rounded-xl"
                                  value={kr.title}
                                  onChange={(e) =>
                                    setQuarterDrafts((arr) =>
                                      arr.map((it, i) => {
                                        if (i !== idx) return it;
                                        const next = [...it.krs];
                                        next[kIdx] = { ...next[kIdx], title: e.target.value } as DraftKr;
                                        return { ...it, krs: next };
                                      }),
                                    )
                                  }
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">
                Governança: revisão mensal e acompanhamento semanal dos KRs.
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">Para avançar: ao menos 1 objetivo trimestral com 2–4 KRs e alinhamento a KR anual.</div>
                <Button
                  className="h-11 rounded-2xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                  disabled={quarterSaving || !quarterCycleId || !annualKrs.length}
                  onClick={async () => {
                    if (!quarterCycleId) return;

                    const trimmed = quarterDrafts
                      .map((o) => ({
                        ...o,
                        title: o.title.trim(),
                        description: o.description.trim(),
                        krs: o.krs.map((k) => ({ ...k, title: k.title.trim() })).filter((k) => k.title.length >= 6),
                      }))
                      .filter((o) => o.title.length >= 6);

                    if (!trimmed.length) {
                      toast({ title: "Crie ao menos 1 objetivo", variant: "destructive" });
                      return;
                    }

                    const invalid = trimmed.some((o) => o.alignToKrId === SELECT_NONE || o.krs.length < 2 || o.krs.length > 4);
                    if (invalid) {
                      toast({ title: "Ajuste os campos", description: "Alinhe cada objetivo a um KR anual e mantenha 2–4 KRs.", variant: "destructive" });
                      return;
                    }

                    const annualKrById = new Map(annualKrs.map((k) => [k.id, k] as const));

                    try {
                      setQuarterSaving(true);
                      for (const o of trimmed) {
                        const parentKr = annualKrById.get(o.alignToKrId);
                        const parentObjectiveId = parentKr?.objective_id ?? null;

                        const created = await createOkrObjective({
                          company_id: cid,
                          cycle_id: quarterCycleId,
                          parent_objective_id: parentObjectiveId,
                          strategy_objective_id: null,
                          level: "COMPANY" as ObjectiveLevel,
                          department_id: null,
                          tier: "TIER1" as const,
                          moderator_user_id: null,
                          owner_user_id: user.id,
                          title: o.title,
                          description: o.description || null,
                          strategic_reason: null,
                          linked_fundamental: null,
                          linked_fundamental_text: null,
                          due_at: null,
                          expected_attainment_pct: null,
                          estimated_value_brl: null,
                          estimated_effort_hours: null,
                          estimated_cost_brl: null,
                          estimated_roi_pct: null,
                          expected_profit_brl: null,
                          profit_thesis: null,
                          expected_revenue_at: null,
                        });

                        await linkObjectiveToKr(o.alignToKrId, created.id);

                        for (const kr of o.krs) {
                          await createKeyResult({
                            objective_id: created.id,
                            title: kr.title,
                            kind: "METRIC",
                            due_at: null,
                            achieved: false,
                            metric_unit: null,
                            start_value: null,
                            current_value: null,
                            target_value: null,
                            owner_user_id: user.id,
                            confidence: "ON_TRACK",
                          });
                        }
                      }

                      setQuarterDrafts([]);
                      await qc.invalidateQueries({ queryKey: ["okr-quarter-objectives", cid, quarterCycleId] });
                      toast({ title: "OKRs estratégicos do trimestre salvos" });
                    } catch (e) {
                      toast({
                        title: "Não foi possível salvar",
                        description: getErrorMessage(e),
                        variant: "destructive",
                      });
                    } finally {
                      setQuarterSaving(false);
                    }
                  }}
                >
                  Salvar OKRs do trimestre
                  <CheckCircle2 className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {step === 5 ? (
        <div className="grid gap-6">
          <StepHeader
            title="Etapa 5 — OKRs tático-operacionais (por time)"
            subtitle="Tático = execução que move a estratégia. Aqui criamos OKRs por departamento alinhados ao trimestre estratégico."
            badge={{ label: "Times", icon: <Users className="h-3.5 w-3.5" /> }}
          />

          <CoachCard
            title="Como alinhar (simples)"
            lines={[
              "Cada objetivo tático deve 'descer' de um KR estratégico do trimestre.",
              "O alinhamento cria uma árvore: KR estratégico → OKR do time → KRs táticos.",
              "Governança: revisão mensal e acompanhamento semanal.",
            ]}
          />

          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="grid gap-4">
              {!quarterCycleId ? (
                <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">Selecione/crie um trimestre na etapa 4.</div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Criar objetivos táticos por departamento</div>
                  <div className="mt-1 text-sm text-muted-foreground">Cada objetivo deve alinhar a um KR estratégico trimestral.</div>
                </div>
                <Button
                  variant="outline"
                  className="h-11 rounded-2xl bg-white"
                  disabled={!quarterCycleId}
                  onClick={() =>
                    setTacticalDrafts((d) => [
                      ...d,
                      {
                        departmentId: departments[0]?.id ?? SELECT_NONE,
                        ownerUserId: user.id,
                        title: "",
                        description: "",
                        alignToKrId: SELECT_NONE,
                        krs: [{ title: "", kind: "DELIVERABLE" }],
                      },
                    ])
                  }
                >
                  Adicionar objetivo tático
                </Button>
              </div>

              {!quarterKrs.length ? (
                <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">Você precisa de KRs estratégicos do trimestre para alinhar (etapa 4).</div>
              ) : null}

              <div className="grid gap-4">
                {tacticalDrafts.map((d, idx) => (
                  <div key={idx} className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Objetivo tático #{idx + 1}</div>
                      <Button
                        variant="ghost"
                        className="h-9 rounded-xl text-muted-foreground hover:bg-[color:var(--sinaxys-bg)]"
                        onClick={() => setTacticalDrafts((arr) => arr.filter((_, i) => i !== idx))}
                      >
                        Remover
                      </Button>
                    </div>

                    <div className="mt-4 grid gap-3">
                      <div className="grid gap-2">
                        <Label>Departamento</Label>
                        <Select value={d.departmentId} onValueChange={(v) => setTacticalDrafts((arr) => arr.map((it, i) => (i === idx ? { ...it, departmentId: v } : it)))}>
                          <SelectTrigger className="h-11 rounded-xl">
                            <SelectValue placeholder="Selecione" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            {departments.map((dep) => (
                              <SelectItem key={dep.id} value={dep.id}>
                                {dep.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label>Responsável</Label>
                        <Select value={d.ownerUserId} onValueChange={(v) => setTacticalDrafts((arr) => arr.map((it, i) => (i === idx ? { ...it, ownerUserId: v } : it)))}>
                          <SelectTrigger className="h-11 rounded-xl bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            {profiles.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                {(p.name ?? p.email) || p.id}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label>Título</Label>
                        <Input
                          className="h-11 rounded-xl"
                          value={d.title}
                          onChange={(e) => setTacticalDrafts((arr) => arr.map((it, i) => (i === idx ? { ...it, title: e.target.value } : it)))}
                          placeholder="Ex.: Reduzir tempo de implantação no time de CS"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label>Alinhar ao KR estratégico do trimestre</Label>
                        <Select value={d.alignToKrId} onValueChange={(v) => setTacticalDrafts((arr) => arr.map((it, i) => (i === idx ? { ...it, alignToKrId: v } : it)))}>
                          <SelectTrigger className="h-11 rounded-xl bg-white">
                            <SelectValue placeholder="Selecione um KR" />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            <SelectItem value={SELECT_NONE}>Selecione…</SelectItem>
                            {quarterKrs.map((kr) => (
                              <SelectItem key={kr.id} value={kr.id}>
                                {kr.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <div className="flex items-center justify-between gap-2">
                          <Label>KRs táticos (mínimo 1)</Label>
                          <Button
                            variant="outline"
                            className="h-9 rounded-xl bg-white"
                            onClick={() =>
                              setTacticalDrafts((arr) =>
                                arr.map((it, i) => (i === idx ? { ...it, krs: [...it.krs, { title: "", kind: "DELIVERABLE" }] } : it)),
                              )
                            }
                          >
                            + KR
                          </Button>
                        </div>
                        <div className="grid gap-3">
                          {d.krs.map((kr, kIdx) => (
                            <div key={kIdx} className="rounded-2xl border border-[color:var(--sinaxys-border)] p-4">
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">KR #{kIdx + 1}</div>
                                <Button
                                  variant="ghost"
                                  className="h-8 rounded-xl text-muted-foreground hover:bg-[color:var(--sinaxys-bg)]"
                                  disabled={d.krs.length <= 1}
                                  onClick={() =>
                                    setTacticalDrafts((arr) =>
                                      arr.map((it, i) => (i === idx ? { ...it, krs: it.krs.filter((_, j) => j !== kIdx) } : it)),
                                    )
                                  }
                                >
                                  Remover
                                </Button>
                              </div>
                              <div className="mt-3 grid gap-2">
                                <Label>Título do KR</Label>
                                <Input
                                  className="h-11 rounded-xl"
                                  value={kr.title}
                                  onChange={(e) =>
                                    setTacticalDrafts((arr) =>
                                      arr.map((it, i) => {
                                        if (i !== idx) return it;
                                        const next = [...it.krs];
                                        next[kIdx] = { ...next[kIdx], title: e.target.value } as DraftKr;
                                        return { ...it, krs: next };
                                      }),
                                    )
                                  }
                                />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">
                Governança: revisão mensal e acompanhamento semanal.
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">Para avançar: ao menos 1 objetivo tático alinhado, com pelo menos 1 KR.</div>
                <Button
                  className="h-11 rounded-2xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                  disabled={tacticalSaving || !quarterCycleId || !quarterKrs.length}
                  onClick={async () => {
                    if (!quarterCycleId) return;

                    const trimmed = tacticalDrafts
                      .map((o) => ({
                        ...o,
                        title: o.title.trim(),
                        description: o.description.trim(),
                        krs: o.krs.map((k) => ({ ...k, title: k.title.trim() })).filter((k) => k.title.length >= 6),
                      }))
                      .filter((o) => o.title.length >= 6);

                    if (!trimmed.length) {
                      toast({ title: "Crie ao menos 1 objetivo tático", variant: "destructive" });
                      return;
                    }

                    const invalid = trimmed.some((o) => o.alignToKrId === SELECT_NONE || o.departmentId === SELECT_NONE || !o.krs.length);
                    if (invalid) {
                      toast({ title: "Ajuste os campos", description: "Escolha departamento, alinhamento e ao menos 1 KR.", variant: "destructive" });
                      return;
                    }

                    const qKrById = new Map(quarterKrs.map((k) => [k.id, k] as const));

                    try {
                      setTacticalSaving(true);
                      for (const o of trimmed) {
                        const parentKr = qKrById.get(o.alignToKrId);
                        const parentObjectiveId = parentKr?.objective_id ?? null;

                        const created = await createOkrObjective({
                          company_id: cid,
                          cycle_id: quarterCycleId,
                          parent_objective_id: parentObjectiveId,
                          strategy_objective_id: null,
                          level: "DEPARTMENT" as ObjectiveLevel,
                          department_id: o.departmentId,
                          tier: "TIER2" as const,
                          moderator_user_id: null,
                          owner_user_id: o.ownerUserId,
                          title: o.title,
                          description: o.description || null,
                          strategic_reason: null,
                          linked_fundamental: null,
                          linked_fundamental_text: null,
                          due_at: null,
                          expected_attainment_pct: null,
                          estimated_value_brl: null,
                          estimated_effort_hours: null,
                          estimated_cost_brl: null,
                          estimated_roi_pct: null,
                          expected_profit_brl: null,
                          profit_thesis: null,
                          expected_revenue_at: null,
                        });

                        await linkObjectiveToKr(o.alignToKrId, created.id);

                        for (const kr of o.krs) {
                          await createKeyResult({
                            objective_id: created.id,
                            title: kr.title,
                            kind: "DELIVERABLE",
                            due_at: null,
                            achieved: false,
                            metric_unit: null,
                            start_value: null,
                            current_value: null,
                            target_value: null,
                            owner_user_id: o.ownerUserId,
                            confidence: "ON_TRACK",
                          });
                        }
                      }

                      setTacticalDrafts([]);
                      await qc.invalidateQueries({ queryKey: ["okr-quarter-objectives", cid, quarterCycleId] });
                      toast({ title: "OKRs táticos salvos" });
                    } catch (e) {
                      toast({
                        title: "Não foi possível salvar",
                        description: getErrorMessage(e),
                        variant: "destructive",
                      });
                    } finally {
                      setTacticalSaving(false);
                    }
                  }}
                >
                  Salvar OKRs táticos
                  <CheckCircle2 className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {step === 6 ? (
        <div className="grid gap-6">
          <StepHeader
            title="Etapa 6 — Entregáveis individuais (dentro do KR tático)"
            subtitle="Entregável é a ação concreta que impacta o KR. Aqui NÃO criamos módulo separado de tarefas."
            badge={{ label: "Entregáveis", icon: <ListChecks className="h-3.5 w-3.5" /> }}
          />

          <CoachCard
            title="Como pensar em entregáveis"
            lines={[
              "Entregável = output verificável (o que será produzido/entregue).",
              "É a menor unidade de execução que ainda tem 'dono' e prazo.",
              "Vamos criar entregáveis dentro dos KRs táticos.",
            ]}
          />

          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="grid gap-4">
              {!tacticalKrs.length ? (
                <div className="rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">Você precisa criar KRs táticos na etapa 5.</div>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Adicionar entregável</div>
                  <div className="mt-1 text-sm text-muted-foreground">Escolha um KR tático e defina responsável, prazo e status.</div>
                </div>
                <Button
                  variant="outline"
                  className="h-11 rounded-2xl bg-white"
                  disabled={!tacticalKrs.length}
                  onClick={() =>
                    setDeliverableDrafts((d) => [
                      ...d,
                      {
                        keyResultId: tacticalKrs[0]?.id ?? SELECT_NONE,
                        title: "",
                        description: "",
                        ownerUserId: user.id,
                        dueAt: "",
                        status: "TODO",
                      },
                    ])
                  }
                >
                  Adicionar entregável
                </Button>
              </div>

              <div className="grid gap-4">
                {deliverableDrafts.map((d, idx) => (
                  <div key={idx} className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-5">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Entregável #{idx + 1}</div>
                      <Button
                        variant="ghost"
                        className="h-9 rounded-xl text-muted-foreground hover:bg-[color:var(--sinaxys-bg)]"
                        onClick={() => setDeliverableDrafts((arr) => arr.filter((_, i) => i !== idx))}
                      >
                        Remover
                      </Button>
                    </div>

                    <div className="mt-4 grid gap-3">
                      <div className="grid gap-2">
                        <Label>KR tático</Label>
                        <Select
                          value={d.keyResultId}
                          onValueChange={(v) => setDeliverableDrafts((arr) => arr.map((it, i) => (i === idx ? { ...it, keyResultId: v } : it)))}
                        >
                          <SelectTrigger className="h-11 rounded-xl bg-white">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-2xl">
                            {tacticalKrs.map((kr) => (
                              <SelectItem key={kr.id} value={kr.id}>
                                {kr.title}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="grid gap-2">
                        <Label>Título</Label>
                        <Input
                          className="h-11 rounded-xl"
                          value={d.title}
                          onChange={(e) => setDeliverableDrafts((arr) => arr.map((it, i) => (i === idx ? { ...it, title: e.target.value } : it)))}
                          placeholder="Ex.: Implementar novo playbook de onboarding"
                        />
                      </div>

                      <div className="grid gap-2">
                        <Label>Descrição</Label>
                        <Textarea
                          className="min-h-[88px] rounded-2xl"
                          value={d.description}
                          onChange={(e) => setDeliverableDrafts((arr) => arr.map((it, i) => (i === idx ? { ...it, description: e.target.value } : it)))}
                        />
                      </div>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                        <div className="grid gap-2">
                          <Label>Responsável</Label>
                          <Select
                            value={d.ownerUserId}
                            onValueChange={(v) => setDeliverableDrafts((arr) => arr.map((it, i) => (i === idx ? { ...it, ownerUserId: v } : it)))}
                          >
                            <SelectTrigger className="h-11 rounded-xl bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                              {profiles.map((p) => (
                                <SelectItem key={p.id} value={p.id}>
                                  {(p.name ?? p.email) || p.id}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="grid gap-2">
                          <Label>Prazo (YYYY-MM-DD)</Label>
                          <Input
                            className="h-11 rounded-xl"
                            value={d.dueAt}
                            onChange={(e) => setDeliverableDrafts((arr) => arr.map((it, i) => (i === idx ? { ...it, dueAt: e.target.value } : it)))}
                            placeholder="2026-03-15"
                          />
                        </div>

                        <div className="grid gap-2">
                          <Label>Status</Label>
                          <Select
                            value={d.status}
                            onValueChange={(v) => setDeliverableDrafts((arr) => arr.map((it, i) => (i === idx ? { ...it, status: v as WorkStatus } : it)))}
                          >
                            <SelectTrigger className="h-11 rounded-xl bg-white">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                              <SelectItem value="TODO">A fazer</SelectItem>
                              <SelectItem value="IN_PROGRESS">Em andamento</SelectItem>
                              <SelectItem value="DONE">Concluído</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <Separator />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Entregáveis já criados</div>
                  <div className="mt-1 text-sm text-muted-foreground">(dentro dos KRs táticos)</div>
                </div>
                <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)] hover:bg-[color:var(--sinaxys-tint)]">
                  {existingDeliverables.length} entregáveis
                </Badge>
              </div>

              <div className="grid gap-3">
                {existingDeliverables.length ? (
                  existingDeliverables.map((d) => (
                    <div key={d.id} className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{d.title}</div>
                          <div className="mt-1 text-xs text-muted-foreground">KR: {tacticalKrs.find((k) => k.id === d.key_result_id)?.title ?? "—"}</div>
                        </div>
                        <Badge className="rounded-full bg-[color:var(--sinaxys-bg)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-bg)]">{d.status}</Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Nenhum entregável ainda.</div>
                )}
              </div>

              <Separator />

              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs text-muted-foreground">Para avançar: salve ao menos 1 entregável.</div>
                <Button
                  className="h-11 rounded-2xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                  disabled={deliverablesSaving || !deliverableDrafts.length}
                  onClick={async () => {
                    const trimmed = deliverableDrafts
                      .map((d) => ({
                        ...d,
                        title: d.title.trim(),
                        description: d.description.trim(),
                        dueAt: d.dueAt.trim(),
                      }))
                      .filter((d) => d.keyResultId !== SELECT_NONE && d.title.length >= 6 && d.ownerUserId);

                    if (!trimmed.length) {
                      toast({ title: "Ajuste os entregáveis", description: "Escolha KR, título (>=6) e responsável.", variant: "destructive" });
                      return;
                    }

                    try {
                      setDeliverablesSaving(true);
                      for (const d of trimmed) {
                        await createDeliverable({
                          key_result_id: d.keyResultId,
                          tier: "TIER2",
                          title: d.title,
                          description: d.description || null,
                          owner_user_id: d.ownerUserId,
                          status: d.status,
                          start_date: null,
                          performance_indicator_id: null,
                          due_at: d.dueAt || null,
                        });
                      }

                      setDeliverableDrafts([]);
                      await qc.invalidateQueries({ queryKey: ["okr-tactical-deliverables", tacticalKrs.map((k) => k.id).join(",")] });
                      toast({ title: "Entregáveis salvos" });
                    } catch (e) {
                      toast({
                        title: "Não foi possível salvar",
                        description: getErrorMessage(e),
                        variant: "destructive",
                      });
                    } finally {
                      setDeliverablesSaving(false);
                    }
                  }}
                >
                  Salvar entregáveis
                  <CheckCircle2 className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {step === 7 ? (
        <div className="grid gap-6">
          <StepHeader
            title="Mapa completo — Fundamentos → Estratégia → Execução"
            subtitle="Quando a empresa vê isso com clareza, a execução vira consequência."
            badge={{ label: "Mapa", icon: <Waypoints className="h-3.5 w-3.5" /> }}
          />

          <CoachCard
            title="Próximo passo"
            lines={[
              "Agora você tem uma espinha dorsal estratégica: fundamentos, direção, anual, trimestre e tático.",
              "Use o Mapa para acompanhar alinhamento e pontos de risco.",
              "A partir daqui, a rotina de cadência (semanal/mensal) é o diferencial.",
            ]}
          />

          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="grid gap-3">
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Abrir o mapa</div>
              <div className="text-sm text-muted-foreground">
                O mapa visual completo fica em <Link className="underline" to="/okr/mapa">/okr/mapa</Link>.
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild className="h-11 rounded-2xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
                  <Link to="/okr/mapa">Abrir mapa</Link>
                </Button>
                <Button asChild variant="outline" className="h-11 rounded-2xl bg-white">
                  <Link to="/okr/hoje">Ver execução (Hoje)</Link>
                </Button>
              </div>

              <Separator className="my-2" />

              <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">
                Se algo ficou desalinhado, ajuste o vínculo nos detalhes do objetivo (ou refaça o trimestre). O importante é manter a árvore limpa.
              </div>
            </div>
          </Card>
        </div>
      ) : null}

      {/* FOOTER NAV */}
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button variant="outline" className="h-11 rounded-2xl bg-white" onClick={onPrev} disabled={step === 1}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Button>

          <div className="flex flex-wrap items-center gap-2">
            {step === 1 ? (
              <Badge className={clsx("rounded-full", fundSaved ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900")}>{fundSaved ? "Salvo" : "Pendente"}</Badge>
            ) : null}
            {step === 2 ? (
              <Badge className={clsx("rounded-full", soSaved ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900")}>{soSaved ? "Salvo" : "Pendente"}</Badge>
            ) : null}
            {step === 3 ? (
              <Badge className={clsx("rounded-full", annualReady ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900")}>{annualReady ? "OK" : "Ajustar"}</Badge>
            ) : null}
            {step === 4 ? (
              <Badge className={clsx("rounded-full", quarterReady ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900")}>{quarterReady ? "OK" : "Ajustar"}</Badge>
            ) : null}
            {step === 5 ? (
              <Badge className={clsx("rounded-full", tacticalReady ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900")}>{tacticalReady ? "OK" : "Ajustar"}</Badge>
            ) : null}
            {step === 6 ? (
              <Badge className={clsx("rounded-full", deliverablesReady ? "bg-emerald-100 text-emerald-900" : "bg-amber-100 text-amber-900")}>{deliverablesReady ? "OK" : "Ajustar"}</Badge>
            ) : null}
          </div>

          <Button
            className="h-11 rounded-2xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
            onClick={onNext}
            disabled={
              (step === 1 && !canGoStep2) ||
              (step === 2 && !canGoStep3) ||
              (step === 3 && !annualReady) ||
              (step === 4 && !quarterReady) ||
              (step === 5 && !tacticalReady) ||
              (step === 6 && !deliverablesReady) ||
              step === 7
            }
          >
            Avançar
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </div>
      </Card>
    </div>
  );
}