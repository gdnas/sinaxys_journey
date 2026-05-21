import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, CalendarClock, LineChart, Pencil, Plus, Sparkles, Trash2, TrendingUp } from "lucide-react";
import { Link, Navigate } from "react-router-dom";
import { Area, AreaChart, CartesianGrid, Line, XAxis, YAxis } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { ResponsiveTable } from "@/components/ResponsiveTable";
import { useToast } from "@/hooks/use-toast";
import { useCompanyModuleEnabled } from "@/hooks/useCompanyModuleEnabled";
import { useAuth } from "@/lib/auth";
import { isCompanyWideDepartmentName } from "@/lib/companyWideDepartment";
import { useCompany } from "@/lib/company";
import { listCostItems, type CostItem } from "@/lib/costItemsDb";
import { listDepartments } from "@/lib/departmentsDb";
import {
  createFinanceForecastAdjustment,
  deleteFinanceForecastAdjustment,
  listFinanceFiscalPeriods,
  listFinanceForecastAdjustments,
  listFinanceScenarios,
  listFinanceVersionLines,
  listFinanceVersions,
  seedFinanceFiscalPeriods,
  seedFinanceScenarios,
  updateFinanceForecastAdjustment,
  type FinanceForecastAdjustment,
  type FinanceScenario,
  type FinanceVersion,
  type FinanceVersionLine,
} from "@/lib/financeDb";

type ForecastMonth = {
  key: string;
  year: number;
  month: number;
  label: string;
};

type AdjustmentDraftAction = "set_amount" | "stop";

type AdjustmentDraft = {
  cost_item_id: string;
  action: AdjustmentDraftAction;
  amount: string;
  effective_key: string;
  notes: string;
};

function brl(value: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);
}

function n(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function monthKey(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

function compareMonth(aYear: number, aMonth: number, bYear: number, bMonth: number) {
  if (aYear !== bYear) return aYear - bYear;
  return aMonth - bMonth;
}

function buildForecastMonths(count: number) {
  const formatter = new Intl.DateTimeFormat("pt-BR", { month: "short", year: "2-digit" });
  const today = new Date();
  today.setDate(1);

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(today.getFullYear(), today.getMonth() + index, 1);
    return {
      key: monthKey(date.getFullYear(), date.getMonth() + 1),
      year: date.getFullYear(),
      month: date.getMonth() + 1,
      label: formatter.format(date).replace(".", ""),
    } satisfies ForecastMonth;
  });
}

function defaultDraft(months: ForecastMonth[], costItemId?: string): AdjustmentDraft {
  return {
    cost_item_id: costItemId ?? "",
    action: "stop",
    amount: "0",
    effective_key: months[0]?.key ?? "",
    notes: "",
  };
}

function monthlyBaseCostForItem(item: CostItem, month: ForecastMonth, firstMonth: ForecastMonth) {
  if (!item.active) return 0;

  if (item.billing_cycle === "one_time") {
    if (item.competence_year && item.competence_month) {
      return item.competence_year === month.year && item.competence_month === month.month ? n(item.total_monthly_cost) : 0;
    }
    return month.key === firstMonth.key ? n(item.total_monthly_cost) : 0;
  }

  return n(item.total_monthly_cost);
}

function adjustmentLabel(action: FinanceForecastAdjustment["action"], amount: number | null) {
  if (action === "stop") return "Encerrar lançamento";
  return `Alterar para ${brl(n(amount))}`;
}

const chartConfig = {
  projectedExpenses: { label: "Custos recorrentes", color: "hsl(var(--primary))" },
  financePlan: { label: "Plano financeiro", color: "#7c86ff" },
  total: { label: "Total projetado", color: "#14b8a6" },
} satisfies ChartConfig;

export default function FinanceForecast() {
  const { user } = useAuth();
  const { companyId } = useCompany();
  const { enabled, isLoading } = useCompanyModuleEnabled("FINANCE");
  const { toast } = useToast();

  const forecastMonths = useMemo(() => buildForecastMonths(12), []);
  const planningMonths = useMemo(() => buildForecastMonths(18), []);
  const firstForecastMonth = forecastMonths[0];

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scenarios, setScenarios] = useState<FinanceScenario[]>([]);
  const [versions, setVersions] = useState<FinanceVersion[]>([]);
  const [periodRows, setPeriodRows] = useState<Array<{ id: string; fiscal_year: number; fiscal_month: number | null }>>([]);
  const [versionLines, setVersionLines] = useState<FinanceVersionLine[]>([]);
  const [costItems, setCostItems] = useState<CostItem[]>([]);
  const [adjustments, setAdjustments] = useState<FinanceForecastAdjustment[]>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedScenarioId, setSelectedScenarioId] = useState("");
  const [selectedVersionId, setSelectedVersionId] = useState("none");
  const [search, setSearch] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingAdjustment, setEditingAdjustment] = useState<FinanceForecastAdjustment | null>(null);
  const [draft, setDraft] = useState<AdjustmentDraft>(() => defaultDraft(buildForecastMonths(18)));

  async function loadBase() {
    if (!companyId || !user?.id) return;

    setLoading(true);
    await Promise.all([seedFinanceScenarios(companyId, user.id), seedFinanceFiscalPeriods(companyId)]);

    const [scenarioRows, versionRows, departmentRows, costItemRows, fiscalPeriods] = await Promise.all([
      listFinanceScenarios(companyId),
      listFinanceVersions(companyId),
      listDepartments(companyId),
      listCostItems(companyId, true),
      listFinanceFiscalPeriods(companyId),
    ]);

    setScenarios(scenarioRows);
    setVersions(versionRows);
    setDepartments(departmentRows.filter((department) => !isCompanyWideDepartmentName(department.name)));
    setCostItems(costItemRows.filter((item) => item.active));
    setPeriodRows(fiscalPeriods.map((row) => ({ id: row.id, fiscal_year: row.fiscal_year, fiscal_month: row.fiscal_month })));
    setSelectedScenarioId((current) => current || scenarioRows.find((item) => item.status === "active")?.id || scenarioRows[0]?.id || "");
    setSelectedVersionId((current) => {
      if (current !== "none" && versionRows.some((item) => item.id === current)) return current;
      return versionRows[0]?.id ?? "none";
    });
    setLoading(false);
  }

  async function loadScenarioAdjustments(scenarioId: string) {
    if (!companyId || !scenarioId) {
      setAdjustments([]);
      return;
    }
    const rows = await listFinanceForecastAdjustments(companyId, scenarioId);
    setAdjustments(rows);
  }

  async function loadVersionLines(versionId: string) {
    if (versionId === "none") {
      setVersionLines([]);
      return;
    }
    const rows = await listFinanceVersionLines(versionId);
    setVersionLines(rows);
  }

  useEffect(() => {
    if (!companyId || !user?.id) return;
    void loadBase();
  }, [companyId, user?.id]);

  useEffect(() => {
    if (!selectedScenarioId) return;
    void loadScenarioAdjustments(selectedScenarioId);
  }, [selectedScenarioId]);

  useEffect(() => {
    void loadVersionLines(selectedVersionId);
  }, [selectedVersionId]);

  const selectedScenario = useMemo(
    () => scenarios.find((scenario) => scenario.id === selectedScenarioId) ?? null,
    [scenarios, selectedScenarioId],
  );

  const selectedVersion = useMemo(
    () => versions.find((version) => version.id === selectedVersionId) ?? null,
    [selectedVersionId, versions],
  );

  const departmentById = useMemo(
    () => new Map(departments.map((department) => [department.id, department.name] as const)),
    [departments],
  );

  const versionPeriodMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const period of periodRows) {
      if (!period.fiscal_month) continue;
      map.set(period.id, monthKey(period.fiscal_year, period.fiscal_month));
    }
    return map;
  }, [periodRows]);

  const adjustmentsByItem = useMemo(() => {
    const map = new Map<string, FinanceForecastAdjustment[]>();

    for (const adjustment of adjustments) {
      const list = map.get(adjustment.cost_item_id) ?? [];
      list.push(adjustment);
      map.set(adjustment.cost_item_id, list);
    }

    for (const [itemId, list] of map.entries()) {
      map.set(itemId, [...list].sort((a, b) => compareMonth(a.effective_year, a.effective_month, b.effective_year, b.effective_month)));
    }

    return map;
  }, [adjustments]);

  const filteredCostItems = useMemo(() => {
    return costItems.filter((item) => {
      const departmentName = item.owner_department_id ? departmentById.get(item.owner_department_id) ?? "" : "";
      const matchesSearch = !search.trim() || [item.name, item.category, item.notes, departmentName]
        .some((value) => value?.toLowerCase().includes(search.trim().toLowerCase()));
      const matchesDepartment = departmentFilter === "all" || item.owner_department_id === departmentFilter;
      return matchesSearch && matchesDepartment;
    });
  }, [costItems, departmentById, departmentFilter, search]);

  const chartData = useMemo(() => {
    const financePlanByMonth = new Map<string, number>();

    for (const line of versionLines) {
      const periodKey = versionPeriodMap.get(line.fiscal_period_id);
      if (!periodKey) continue;
      financePlanByMonth.set(periodKey, (financePlanByMonth.get(periodKey) ?? 0) + n(line.amount));
    }

    return forecastMonths.map((month) => {
      const projectedExpenses = filteredCostItems.reduce((sum, item) => {
        let amount = monthlyBaseCostForItem(item, month, firstForecastMonth);
        const itemAdjustments = adjustmentsByItem.get(item.id) ?? [];

        for (const adjustment of itemAdjustments) {
          if (compareMonth(adjustment.effective_year, adjustment.effective_month, month.year, month.month) > 0) continue;
          if (adjustment.action === "stop") amount = 0;
          if (adjustment.action === "set_amount") amount = n(adjustment.amount);
        }

        return sum + amount;
      }, 0);

      const financePlan = financePlanByMonth.get(month.key) ?? 0;
      return {
        month: month.label,
        key: month.key,
        projectedExpenses,
        financePlan,
        total: projectedExpenses + financePlan,
      };
    });
  }, [adjustmentsByItem, filteredCostItems, firstForecastMonth, forecastMonths, versionLines, versionPeriodMap]);

  const totals = useMemo(() => {
    const total = chartData.reduce((sum, item) => sum + item.total, 0);
    const average = chartData.length ? total / chartData.length : 0;
    const peak = chartData.reduce((best, item) => (item.total > best.total ? item : best), chartData[0] ?? { month: "—", total: 0 });
    return { total, average, peak };
  }, [chartData]);

  const monitoredRows = useMemo(() => {
    return filteredCostItems
      .map((item) => {
        const nextChange = (adjustmentsByItem.get(item.id) ?? []).find(
          (adjustment) => compareMonth(adjustment.effective_year, adjustment.effective_month, firstForecastMonth.year, firstForecastMonth.month) >= 0,
        ) ?? null;

        return {
          item,
          departmentName: item.owner_department_id ? departmentById.get(item.owner_department_id) ?? "Sem departamento" : "Sem departamento",
          nextChange,
        };
      })
      .sort((a, b) => n(b.item.total_monthly_cost) - n(a.item.total_monthly_cost) || a.item.name.localeCompare(b.item.name));
  }, [adjustmentsByItem, departmentById, filteredCostItems, firstForecastMonth.month, firstForecastMonth.year]);

  function openNewAdjustment(costItemId?: string) {
    setEditingAdjustment(null);
    setDraft(defaultDraft(planningMonths, costItemId));
    setDialogOpen(true);
  }

  function openEditAdjustment(adjustment: FinanceForecastAdjustment) {
    setEditingAdjustment(adjustment);
    setDraft({
      cost_item_id: adjustment.cost_item_id,
      action: adjustment.action === "stop" ? "stop" : "set_amount",
      amount: adjustment.amount?.toString() ?? "0",
      effective_key: monthKey(adjustment.effective_year, adjustment.effective_month),
      notes: adjustment.notes ?? "",
    });
    setDialogOpen(true);
  }

  async function handleSaveAdjustment() {
    if (!companyId || !user?.id || !selectedScenarioId) return;

    if (!draft.cost_item_id) {
      toast({ title: "Selecione uma despesa", description: "Escolha o lançamento que terá mudança futura.", variant: "destructive" });
      return;
    }

    const [yearText, monthText] = draft.effective_key.split("-");
    const effectiveYear = Number(yearText);
    const effectiveMonth = Number(monthText);
    const parsedAmount = draft.action === "set_amount" ? Number(draft.amount) : null;

    if (!effectiveYear || !effectiveMonth) {
      toast({ title: "Data inválida", description: "Escolha o mês em que a mudança passa a valer.", variant: "destructive" });
      return;
    }

    if (draft.action === "set_amount" && (!Number.isFinite(parsedAmount) || parsedAmount < 0)) {
      toast({ title: "Valor inválido", description: "Defina um valor mensal maior ou igual a zero.", variant: "destructive" });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        scenario_id: selectedScenarioId,
        cost_item_id: draft.cost_item_id,
        action: draft.action,
        amount: draft.action === "set_amount" ? parsedAmount : null,
        effective_year: effectiveYear,
        effective_month: effectiveMonth,
        notes: draft.notes.trim() || null,
      };

      if (editingAdjustment) {
        await updateFinanceForecastAdjustment(editingAdjustment.id, payload);
        toast({ title: "Mudança atualizada", description: "A nova regra já foi aplicada ao forecast." });
      } else {
        await createFinanceForecastAdjustment(companyId, user.id, payload);
        toast({ title: "Mudança programada", description: "A regra futura já entrou no gráfico de previsibilidade." });
      }

      await loadScenarioAdjustments(selectedScenarioId);
      setDialogOpen(false);
      setEditingAdjustment(null);
      setDraft(defaultDraft(planningMonths));
    } catch (error) {
      toast({
        title: "Erro ao salvar",
        description: error instanceof Error ? error.message : "Não foi possível salvar a mudança futura.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  }

  async function handleDeleteAdjustment(id: string) {
    try {
      await deleteFinanceForecastAdjustment(id);
      await loadScenarioAdjustments(selectedScenarioId);
      toast({ title: "Mudança removida", description: "A regra saiu do forecast do cenário." });
    } catch (error) {
      toast({
        title: "Erro ao remover",
        description: error instanceof Error ? error.message : "Não foi possível remover a mudança futura.",
        variant: "destructive",
      });
    }
  }

  if (!user) return <Navigate to="/login" replace />;
  if (isLoading || loading) {
    return (
      <div className="grid min-h-[60vh] place-items-center px-4">
        <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white px-6 py-4 text-sm text-muted-foreground">Carregando…</div>
      </div>
    );
  }
  if (!enabled) return <Navigate to="/finance" replace />;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[color:var(--sinaxys-bg)] px-4 py-6 md:px-6">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
        <section className="rounded-[28px] border border-[color:var(--sinaxys-border)] bg-white/5 p-6 backdrop-blur md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-[color:var(--sinaxys-border)] bg-white/5 px-3 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)]/80">
                <Sparkles className="h-3.5 w-3.5 text-[color:var(--sinaxys-primary)]" />
                Forecast financeiro
              </div>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight md:text-5xl">Preveja mudanças antes que elas virem surpresa.</h1>
              <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[color:var(--sinaxys-ink)]/70 md:text-base">
                Monte uma leitura visual dos próximos meses e programe mudanças futuras nos lançamentos recorrentes — por exemplo, encerrar uma assinatura em setembro ou reduzir o valor de uma ferramenta a partir de novembro.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button asChild variant="outline" className="rounded-full border-[color:var(--sinaxys-border)] bg-white/0 text-[color:var(--sinaxys-ink)] hover:bg-white/5">
                <Link to="/finance">
                  <ArrowLeft className="mr-2 h-4 w-4" />Voltar ao financeiro
                </Link>
              </Button>
              <Button className="rounded-full bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90" onClick={() => openNewAdjustment()}>
                <Plus className="mr-2 h-4 w-4" />Programar mudança futura
              </Button>
            </div>
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-[1fr_240px_240px]">
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Cenário</Label>
            <Select value={selectedScenarioId} onValueChange={setSelectedScenarioId}>
              <SelectTrigger className="mt-2 h-11 rounded-2xl">
                <SelectValue placeholder="Selecione um cenário" />
              </SelectTrigger>
              <SelectContent>
                {scenarios.map((scenario) => (
                  <SelectItem key={scenario.id} value={scenario.id}>
                    {scenario.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-3 text-xs text-muted-foreground">As mudanças futuras ficam vinculadas ao cenário selecionado.</div>
          </Card>

          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">Versão-base</Label>
            <Select value={selectedVersionId} onValueChange={setSelectedVersionId}>
              <SelectTrigger className="mt-2 h-11 rounded-2xl">
                <SelectValue placeholder="Sem versão" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sem versão</SelectItem>
                {versions.map((version) => (
                  <SelectItem key={version.id} value={version.id}>
                    {version.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="mt-3 text-xs text-muted-foreground">Opcional: soma as linhas financeiras da versão ao gráfico.</div>
          </Card>

          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Horizonte</div>
            <div className="mt-2 text-xl font-semibold text-[color:var(--sinaxys-ink)]">12 meses</div>
            <div className="mt-3 text-xs text-muted-foreground">{selectedScenario?.name ?? "Sem cenário"} {selectedVersion ? `• ${selectedVersion.name}` : "• sem versão-base"}</div>
          </Card>
        </section>

        <section className="grid gap-4 md:grid-cols-4">
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
            <div className="text-xs uppercase tracking-wide text-muted-foreground">Total projetado</div>
            <div className="mt-2 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{brl(totals.total)}</div>
            <div className="mt-1 text-xs text-muted-foreground">Soma do horizonte analisado.</div>
          </Card>
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <TrendingUp className="h-4 w-4" />Média mensal
            </div>
            <div className="mt-2 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{brl(totals.average)}</div>
            <div className="mt-1 text-xs text-muted-foreground">Leitura média da operação projetada.</div>
          </Card>
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <CalendarClock className="h-4 w-4" />Mês de pico
            </div>
            <div className="mt-2 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{totals.peak.month}</div>
            <div className="mt-1 text-xs text-muted-foreground">{brl(totals.peak.total)}</div>
          </Card>
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-5">
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-muted-foreground">
              <LineChart className="h-4 w-4" />Mudanças programadas
            </div>
            <div className="mt-2 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{adjustments.length}</div>
            <div className="mt-1 text-xs text-muted-foreground">Regras futuras ativas neste cenário.</div>
          </Card>
        </section>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Gráfico de previsibilidade financeira</div>
              <p className="mt-1 text-sm text-muted-foreground">O gráfico mostra o comportamento dos custos recorrentes com as mudanças futuras do cenário, somando também a versão-base quando ela estiver selecionada.</p>
            </div>
            <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">12 meses</Badge>
          </div>

          <div className="mt-6 rounded-[28px] border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/35 p-3 md:p-4">
            <ChartContainer config={chartConfig} className="h-[320px] w-full">
              <AreaChart data={chartData} margin={{ left: 12, right: 12, top: 8, bottom: 0 }}>
                <CartesianGrid vertical={false} />
                <XAxis dataKey="month" tickLine={false} axisLine={false} />
                <YAxis tickFormatter={(value) => `${Math.round(Number(value) / 1000)}k`} tickLine={false} axisLine={false} width={44} />
                <ChartTooltip content={<ChartTooltipContent formatter={(value) => <span className="font-medium text-[color:var(--sinaxys-ink)]">{brl(Number(value))}</span>} />} />
                <Area type="monotone" dataKey="projectedExpenses" fill="var(--color-projectedExpenses)" fillOpacity={0.22} stroke="var(--color-projectedExpenses)" strokeWidth={2} />
                <Area type="monotone" dataKey="financePlan" fill="var(--color-financePlan)" fillOpacity={0.18} stroke="var(--color-financePlan)" strokeWidth={2} />
                <Line type="monotone" dataKey="total" stroke="var(--color-total)" strokeWidth={3} dot={false} />
              </AreaChart>
            </ChartContainer>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)]/40 p-4 text-sm text-muted-foreground">
              <span className="font-semibold text-[color:var(--sinaxys-ink)]">Custos recorrentes:</span> plataformas, despesas não-humanas e demais itens ativos em Costs.
            </div>
            <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)]/40 p-4 text-sm text-muted-foreground">
              <span className="font-semibold text-[color:var(--sinaxys-ink)]">Versão-base:</span> linhas da versão financeira selecionada, quando houver.
            </div>
            <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)]/40 p-4 text-sm text-muted-foreground">
              <span className="font-semibold text-[color:var(--sinaxys-ink)]">Mudanças futuras:</span> alteram somente o forecast do cenário, sem mexer no cadastro original.
            </div>
          </div>
        </Card>

        <section className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Lançamentos monitorados</div>
                <p className="mt-1 text-sm text-muted-foreground">Escolha qualquer despesa recorrente e programe o mês em que ela muda de comportamento.</p>
              </div>
              <Button className="rounded-full bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90" onClick={() => openNewAdjustment()}>
                <Plus className="mr-2 h-4 w-4" />Nova mudança
              </Button>
            </div>

            <Separator className="my-5" />

            <div className="grid gap-3 md:grid-cols-[1.3fr_260px]">
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar ferramenta, despesa ou categoria" className="h-11 rounded-2xl" />
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="h-11 rounded-2xl">
                  <SelectValue placeholder="Departamento" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os departamentos</SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.id}>
                      {department.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mt-5">
              <ResponsiveTable minWidth="980px">
                <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white">
                  <Table className="min-w-[980px]">
                    <TableHeader>
                      <TableRow>
                        <TableHead>Lançamento</TableHead>
                        <TableHead>Departamento</TableHead>
                        <TableHead>Categoria</TableHead>
                        <TableHead className="text-right">Valor atual</TableHead>
                        <TableHead>Próxima mudança</TableHead>
                        <TableHead className="text-right">Ação</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {monitoredRows.map(({ item, departmentName, nextChange }) => (
                        <TableRow key={item.id} className="hover:bg-[color:var(--sinaxys-tint)]/35">
                          <TableCell>
                            <div>
                              <div className="font-semibold text-[color:var(--sinaxys-ink)]">{item.name}</div>
                              <div className="mt-1 text-xs text-muted-foreground">{item.billing_cycle === "monthly" ? "Mensal" : item.billing_cycle === "annual" ? "Anual" : "Única"}</div>
                            </div>
                          </TableCell>
                          <TableCell className="text-muted-foreground">{departmentName}</TableCell>
                          <TableCell className="text-muted-foreground">{item.category || "Sem categoria"}</TableCell>
                          <TableCell className="text-right font-semibold text-[color:var(--sinaxys-ink)]">{brl(n(item.total_monthly_cost))}</TableCell>
                          <TableCell>
                            {nextChange ? (
                              <div>
                                <div className="text-sm font-medium text-[color:var(--sinaxys-ink)]">{adjustmentLabel(nextChange.action, nextChange.amount)}</div>
                                <div className="mt-1 text-xs text-muted-foreground">a partir de {String(nextChange.effective_month).padStart(2, "0")}/{nextChange.effective_year}</div>
                              </div>
                            ) : (
                              <span className="text-sm text-muted-foreground">Sem mudança programada</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" className="rounded-full" onClick={() => openNewAdjustment(item.id)}>
                              <CalendarClock className="mr-2 h-4 w-4" />Programar
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}

                      {!monitoredRows.length && (
                        <TableRow>
                          <TableCell colSpan={6} className="py-10 text-center text-sm text-muted-foreground">
                            Nenhum lançamento encontrado com os filtros atuais.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </ResponsiveTable>
            </div>
          </Card>

          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Mudanças programadas</div>
              <p className="mt-1 text-sm text-muted-foreground">Timeline das regras futuras que já impactam o forecast deste cenário.</p>
            </div>

            <div className="mt-5 grid gap-3">
              {adjustments.map((adjustment) => {
                const item = costItems.find((costItem) => costItem.id === adjustment.cost_item_id);
                return (
                  <div key={adjustment.id} className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/35 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{item?.name ?? "Despesa removida"}</div>
                        <div className="mt-1 text-xs text-muted-foreground">{adjustmentLabel(adjustment.action, adjustment.amount)} • {String(adjustment.effective_month).padStart(2, "0")}/{adjustment.effective_year}</div>
                        {adjustment.notes ? <div className="mt-2 text-sm text-muted-foreground">{adjustment.notes}</div> : null}
                      </div>
                      <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">{selectedScenario?.name ?? "Cenário"}</Badge>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button variant="outline" className="rounded-full" onClick={() => openEditAdjustment(adjustment)}>
                        <Pencil className="mr-2 h-4 w-4" />Editar
                      </Button>
                      <Button variant="outline" className="rounded-full text-red-600 hover:bg-red-50 hover:text-red-700" onClick={() => handleDeleteAdjustment(adjustment.id)}>
                        <Trash2 className="mr-2 h-4 w-4" />Remover
                      </Button>
                    </div>
                  </div>
                );
              })}

              {!adjustments.length && (
                <div className="rounded-2xl border border-dashed border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/35 p-5 text-sm text-muted-foreground">
                  Ainda não há mudanças futuras programadas para este cenário.
                </div>
              )}
            </div>
          </Card>
        </section>

        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>{editingAdjustment ? "Editar mudança futura" : "Programar mudança futura"}</DialogTitle>
              <DialogDescription>
                Ajuste um lançamento recorrente a partir de um mês específico sem alterar o cadastro original da despesa.
              </DialogDescription>
            </DialogHeader>

            <div className="grid gap-4 py-2">
              <div className="grid gap-2">
                <Label>Lançamento</Label>
                <Select value={draft.cost_item_id} onValueChange={(value) => setDraft((current) => ({ ...current, cost_item_id: value }))}>
                  <SelectTrigger className="h-11 rounded-2xl">
                    <SelectValue placeholder="Selecione uma despesa" />
                  </SelectTrigger>
                  <SelectContent>
                    {costItems.map((item) => (
                      <SelectItem key={item.id} value={item.id}>
                        {item.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Ação</Label>
                  <Select value={draft.action} onValueChange={(value: AdjustmentDraftAction) => setDraft((current) => ({ ...current, action: value }))}>
                    <SelectTrigger className="h-11 rounded-2xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="stop">Encerrar lançamento</SelectItem>
                      <SelectItem value="set_amount">Alterar valor mensal</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label>Válido a partir de</Label>
                  <Select value={draft.effective_key} onValueChange={(value) => setDraft((current) => ({ ...current, effective_key: value }))}>
                    <SelectTrigger className="h-11 rounded-2xl">
                      <SelectValue placeholder="Selecione o mês" />
                    </SelectTrigger>
                    <SelectContent>
                      {planningMonths.map((month) => (
                        <SelectItem key={month.key} value={month.key}>
                          {month.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {draft.action === "set_amount" ? (
                <div className="grid gap-2">
                  <Label>Novo valor mensal</Label>
                  <Input type="number" min="0" step="0.01" value={draft.amount} onChange={(e) => setDraft((current) => ({ ...current, amount: e.target.value }))} className="h-11 rounded-2xl" />
                </div>
              ) : null}

              <div className="grid gap-2">
                <Label>Observações</Label>
                <Textarea value={draft.notes} onChange={(e) => setDraft((current) => ({ ...current, notes: e.target.value }))} placeholder="Ex.: contrato encerrado, redução de usuários, troca por plano menor..." className="min-h-[96px] rounded-2xl" />
              </div>
            </div>

            <DialogFooter className="gap-2 sm:justify-end">
              <Button type="button" variant="outline" className="rounded-full" onClick={() => setDialogOpen(false)}>
                Cancelar
              </Button>
              <Button type="button" className="rounded-full bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90" onClick={handleSaveAdjustment} disabled={saving}>
                {saving ? "Salvando..." : editingAdjustment ? "Salvar mudança" : "Criar mudança"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
