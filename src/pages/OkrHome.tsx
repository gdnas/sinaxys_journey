import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowRight,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  LayoutDashboard,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import {
  getCompanyFundamentals,
  krProgressPct,
  listKeyResultsByObjectiveIds,
  listOkrCycles,
  listOkrObjectives,
  listOkrObjectivesByCycle,
  listStrategyObjectives,
  type DbOkrKeyResult,
  type DbOkrObjective,
} from "@/lib/okrDb";
import { OkrPageHeader } from "@/components/OkrPageHeader";
import { OkrSubnav } from "@/components/OkrSubnav";
import { useMemo } from "react";
import { format, addDays, startOfWeek, startOfMonth, addMonths } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

function StatusCard({
  label,
  pct,
  configured,
}: {
  label: string;
  pct: number | null;
  configured: boolean;
}) {
  return (
    <div className="flex flex-col gap-1">
      <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      {configured ? (
        <div className="flex items-baseline gap-1">
          <span className="text-3xl font-bold text-[color:var(--sinaxys-ink)]">
            {pct ?? 0}%
          </span>
        </div>
      ) : (
        <div className="text-sm font-medium text-amber-600">Não configurado</div>
      )}
    </div>
  );
}

export default function OkrHome() {
  const { user } = useAuth();
  const { companyId } = useCompany();

  if (!user) return null;

  const cid = companyId ?? "";
  const hasCompany = !!companyId;

  // --- Data Loading ---
  const { data: fundamentals } = useQuery({
    queryKey: ["okr-fundamentals", cid],
    enabled: hasCompany,
    queryFn: () => getCompanyFundamentals(cid),
  });

  const { data: strategyObjectives = [] } = useQuery({
    queryKey: ["okr-strategy-objectives", cid],
    enabled: hasCompany,
    queryFn: () => listStrategyObjectives(cid),
  });

  const { data: cycles = [] } = useQuery({
    queryKey: ["okr-cycles", cid],
    enabled: hasCompany,
    queryFn: () => listOkrCycles(cid),
  });

  const activeYear = cycles.find((c) => c.type === "ANNUAL" && c.status === "ACTIVE") ?? null;
  const activeQuarter = cycles.find((c) => c.type === "QUARTERLY" && c.status === "ACTIVE") ?? null;

  const { data: yearObjectives = [] } = useQuery({
    queryKey: ["okr-objectives-year", cid, activeYear?.id],
    enabled: hasCompany && !!activeYear?.id,
    queryFn: () => listOkrObjectivesByCycle(cid, String(activeYear?.id)),
  });

  const { data: quarterObjectives = [] } = useQuery({
    queryKey: ["okr-objectives-quarter", cid, activeQuarter?.id],
    enabled: hasCompany && !!activeQuarter?.id,
    queryFn: () => listOkrObjectivesByCycle(cid, String(activeQuarter?.id)),
  });

  const allObjectiveIds = useMemo(() => {
    return [...yearObjectives.map((o) => o.id), ...quarterObjectives.map((o) => o.id)];
  }, [yearObjectives, quarterObjectives]);

  const { data: allKrs = [] } = useQuery({
    queryKey: ["okr-home-krs", allObjectiveIds.join(",")],
    enabled: allObjectiveIds.length > 0,
    queryFn: () => listKeyResultsByObjectiveIds(allObjectiveIds),
  });

  // --- Calculations ---
  const so2 = strategyObjectives.find((s) => s.horizon_years === 2);
  
  const yearProgress = useMemo(() => {
    if (!yearObjectives.length) return null;
    const krs = allKrs.filter((k) => yearObjectives.some((o) => o.id === k.objective_id));
    if (!krs.length) return 0;
    const pcts = krs.map((k) => krProgressPct(k)).filter((v): v is number => v !== null);
    return pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
  }, [yearObjectives, allKrs]);

  const quarterProgress = useMemo(() => {
    if (!quarterObjectives.length) return null;
    const krs = allKrs.filter((k) => quarterObjectives.some((o) => o.id === k.objective_id));
    if (!krs.length) return 0;
    const pcts = krs.map((k) => krProgressPct(k)).filter((v): v is number => v !== null);
    return pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : 0;
  }, [quarterObjectives, allKrs]);

  const consolidatedStatus = useMemo(() => {
    const pcts = [yearProgress, quarterProgress].filter((v): v is number => v !== null);
    if (!pcts.length) return "NEUTRAL";
    const min = Math.min(...pcts);
    if (min < 30) return "CRITICAL";
    if (min < 70) return "WARNING";
    return "HEALTHY";
  }, [yearProgress, quarterProgress]);

  const risks = useMemo(() => {
    const list: Array<{ type: string; title: string; owner?: string; id?: string }> = [];
    
    // 1. KRs em risco
    const riskKrs = allKrs.filter(k => k.confidence === "OFF_TRACK" || k.confidence === "AT_RISK").slice(0, 3);
    for (const k of riskKrs) {
      list.push({ type: "KR em risco", title: k.title, id: k.objective_id });
    }

    // 2. Objetivos sem dono
    const noOwner = [...yearObjectives, ...quarterObjectives].filter(o => !o.owner_user_id).slice(0, 2);
    for (const o of noOwner) {
      list.push({ type: "Sem responsável", title: o.title, id: o.id });
    }

    return list.slice(0, 5);
  }, [allKrs, yearObjectives, quarterObjectives]);

  const decisions = useMemo(() => {
    const list: Array<{ type: string; context: string; to: string }> = [];
    
    if (!activeQuarter) {
      list.push({ type: "Ciclo pendente", context: "O novo trimestre ainda não foi iniciado.", to: "/okr/quarter" });
    }
    
    const hasFundamentals = fundamentals && [fundamentals.purpose, fundamentals.mission].every(t => !!t?.trim());
    if (!hasFundamentals) {
      list.push({ type: "Fundamentos", context: "Propósito e Missão não definidos.", to: "/okr/fundamentos" });
    }

    if (quarterObjectives.length > 0 && allKrs.filter(k => quarterObjectives.some(o => o.id === k.objective_id)).length === 0) {
      list.push({ type: "Definição de KRs", context: "Objetivos do trimestre sem KRs configurados.", to: "/okr/quarter" });
    }

    return list.slice(0, 5);
  }, [activeQuarter, fundamentals, quarterObjectives, allKrs]);

  // --- Ritual Dates (Mocked logic based on current date) ---
  const rituals = useMemo(() => {
    const today = new Date();
    return [
      { label: "Revisão Mensal Estratégica", date: format(addMonths(startOfMonth(today), 1), "dd/MM/yyyy") },
      { label: "Check-in Semanal de KR", date: format(addDays(startOfWeek(today, { weekStartsOn: 1 }), 4), "dd/MM/yyyy") }, // Friday
      { label: "Revisão Trimestral", date: "01/04/2026" }
    ];
  }, []);

  if (!hasCompany) {
    return (
      <div className="grid gap-6">
        <OkrPageHeader title="Kairoos" subtitle="Carregando..." icon={<Target className="h-5 w-5" />} />
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-sm text-muted-foreground">Aguardando identificação da empresa...</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl grid gap-8 pb-12">
      <OkrPageHeader
        title="Central de Comando"
        subtitle="Direção, risco e decisão estratégica."
        icon={<LayoutDashboard className="h-5 w-5" />}
        actions={
          <Button asChild className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
            <Link to="/okr/assistente">
              Abrir assistente
              <Sparkles className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        }
      />

      <OkrSubnav />

      {/* 1. STATUS ESTRATÉGICO */}
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-12 flex-1">
            <StatusCard label="Objetivo 2 Anos" pct={null} configured={!!so2} />
            <StatusCard label="OKR Anual" pct={yearProgress} configured={!!activeYear} />
            <StatusCard label="OKR Trimestral" pct={quarterProgress} configured={!!activeQuarter} />
          </div>
          
          <div className="shrink-0 flex items-center gap-4 pl-8 md:border-l border-[color:var(--sinaxys-border)]">
            <div className="text-right">
              <div className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Status Geral</div>
              <div className="mt-1 text-lg font-bold text-[color:var(--sinaxys-ink)]">
                {consolidatedStatus === "HEALTHY" ? "Saudável" : consolidatedStatus === "WARNING" ? "Atenção" : "Crítico"}
              </div>
            </div>
            <div className={cn(
              "h-12 w-12 rounded-2xl flex items-center justify-center",
              consolidatedStatus === "HEALTHY" ? "bg-emerald-100 text-emerald-600" : 
              consolidatedStatus === "WARNING" ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"
            )}>
              {consolidatedStatus === "HEALTHY" ? <CheckCircle2 className="h-6 w-6" /> : <ShieldAlert className="h-6 w-6" />}
            </div>
          </div>
        </div>
      </Card>

      <div className="grid gap-8 lg:grid-cols-2">
        {/* 2. RISCOS ESTRATÉGICOS */}
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-500" />
              <h3 className="font-bold text-[color:var(--sinaxys-ink)]">Riscos Estratégicos</h3>
            </div>
            <Badge variant="outline" className="rounded-full">{risks.length}</Badge>
          </div>
          
          <div className="grid gap-3">
            {risks.length > 0 ? risks.map((risk, i) => (
              <div key={i} className="group flex items-center justify-between p-4 rounded-2xl border border-[color:var(--sinaxys-border)] hover:bg-[color:var(--sinaxys-bg)] transition-colors">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase text-amber-600">{risk.type}</div>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)] truncate">{risk.title}</div>
                </div>
                <Button asChild variant="ghost" size="sm" className="rounded-xl group-hover:bg-white">
                  <Link to={risk.id ? `/okr/objetivos/${risk.id}` : "#"}>
                    Detalhes <ChevronRight className="ml-1 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            )) : (
              <div className="py-8 text-center text-sm text-muted-foreground">Nenhum risco estratégico identificado.</div>
            )}
          </div>
        </Card>

        {/* 3. DECISÕES PENDENTES */}
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
              <h3 className="font-bold text-[color:var(--sinaxys-ink)]">Decisões do Admin</h3>
            </div>
          </div>

          <div className="grid gap-3">
            {decisions.length > 0 ? decisions.map((dec, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-2xl bg-[color:var(--sinaxys-tint)]/30 border border-[color:var(--sinaxys-primary)]/10">
                <div className="min-w-0">
                  <div className="text-[10px] font-bold uppercase text-[color:var(--sinaxys-primary)]">{dec.type}</div>
                  <div className="text-sm text-muted-foreground truncate">{dec.context}</div>
                </div>
                <Button asChild size="sm" className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white">
                  <Link to={dec.to}>Agir</Link>
                </Button>
              </div>
            )) : (
              <div className="py-8 text-center text-sm text-muted-foreground">Nenhuma decisão estratégica pendente.</div>
            )}
          </div>
        </Card>
      </div>

      {/* 4. RITMO DE GESTÃO */}
      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex items-center gap-2 mb-6">
          <Calendar className="h-5 w-5 text-muted-foreground" />
          <h3 className="font-bold text-[color:var(--sinaxys-ink)]">Ritmo de Gestão</h3>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
          {rituals.map((r, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-2xl border border-[color:var(--sinaxys-border)]">
              <div className="h-10 w-10 rounded-xl bg-[color:var(--sinaxys-bg)] flex items-center justify-center shrink-0">
                <Clock className="h-5 w-5 text-muted-foreground" />
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase text-muted-foreground">{r.label}</div>
                <div className="text-sm font-bold text-[color:var(--sinaxys-ink)]">{r.date}</div>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}