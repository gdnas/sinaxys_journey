import { useEffect, useMemo, useState } from "react";
import { Pencil, Plus, Trash2, Users, Wallet, TrendingUp, Sparkles, Link2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { brl, brlPerHourFromMonthly, hourlyFromMonthly } from "@/lib/costs";
import { parsePtNumber, roiPct } from "@/lib/roi";
import { listProfilesByCompany, type DbProfile } from "@/lib/profilesDb";
import { createObjectiveCostItem, deleteObjectiveCostItem, listObjectiveCostItems, updateObjectiveCostItem } from "@/lib/okrCostsDb";
import {
  deleteObjectiveLaborAllocation,
  listObjectiveLaborAllocations,
  upsertObjectiveLaborAllocation,
} from "@/lib/okrLaborDb";
import { updateOkrObjective, type DbOkrObjective } from "@/lib/okrDb";
import {
  listObjectiveCostItemsForObjectives,
  listObjectiveLaborAllocationsForObjectives,
} from "@/lib/okrBusinessCaseDb";

const SELECT_NONE = "__none__";

function n(v: unknown) {
  const x = typeof v === "number" ? v : Number(v);
  return Number.isFinite(x) ? x : 0;
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const a = parts[0]?.[0] ?? "";
  const b = parts[1]?.[0] ?? parts[0]?.[1] ?? "";
  return (a + b).toUpperCase();
}

type HumanRow = {
  id: string;
  userId: string;
  name: string;
  jobTitle: string | null;
  monthlyCostBRL: number | null;
  hours: number;
  hourly: number | null;
  cost: number | null;
  roleLabel: string | null;
  notes: string | null;
};

type LinkedObjective = { id: string; title: string };

export function OkrObjectiveBusinessCase({
  companyId,
  objective,
  canWrite,
  linkedObjectives = [],
}: {
  companyId: string;
  objective: DbOkrObjective;
  canWrite: boolean;
  /** Tier 2 objectives linked to this Tier 1 via KR alignment */
  linkedObjectives?: LinkedObjective[];
}) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const isTier1 = objective.level === "COMPANY";
  const linkedObjectiveIds = useMemo(() => linkedObjectives.map((o) => o.id), [linkedObjectives]);

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles", companyId],
    queryFn: () => listProfilesByCompany(companyId),
    staleTime: 60_000,
  });

  // Tier 2 costs are aggregated for Tier 1; Tier 2 keeps per-objective editing.
  const { data: costItems = [], isLoading: loadingCostItems } = useQuery({
    queryKey: ["okr-objective-cost-items", isTier1 ? linkedObjectiveIds.join(",") : objective.id],
    queryFn: () => (isTier1 ? listObjectiveCostItemsForObjectives(linkedObjectiveIds) : listObjectiveCostItems(objective.id)),
    enabled: !isTier1 || linkedObjectiveIds.length > 0,
  });

  const { data: allocations = [] } = useQuery({
    queryKey: ["okr-objective-labor", isTier1 ? linkedObjectiveIds.join(",") : objective.id],
    queryFn: () => (isTier1 ? listObjectiveLaborAllocationsForObjectives(linkedObjectiveIds) : listObjectiveLaborAllocations(objective.id)),
    enabled: !isTier1 || linkedObjectiveIds.length > 0,
  });

  const profileById = useMemo(() => {
    const m = new Map<string, DbProfile>();
    for (const p of profiles) m.set(p.id, p);
    return m;
  }, [profiles]);

  const humanRows = useMemo((): HumanRow[] => {
    return allocations
      .map((a) => {
        const p = profileById.get(a.user_id);
        const name = p?.name ?? p?.email ?? "Pessoa";
        const monthly = typeof p?.monthly_cost_brl === "number" ? p.monthly_cost_brl : null;
        const hours = n(a.hours_estimated);
        const hourly = monthly && monthly > 0 ? hourlyFromMonthly(monthly) : null;
        const cost = hourly !== null && hours > 0 ? hourly * hours : null;

        return {
          id: a.id,
          userId: a.user_id,
          name,
          jobTitle: p?.job_title ?? null,
          monthlyCostBRL: monthly,
          hours,
          hourly,
          cost,
          roleLabel: a.role_label ?? null,
          notes: a.notes ?? null,
        };
      })
      .sort((a, b) => (b.cost ?? 0) - (a.cost ?? 0));
  }, [allocations, profileById]);

  const humanCostBRL = useMemo(() => {
    const sum = humanRows.reduce((acc, r) => acc + (r.cost ?? 0), 0);
    return Number.isFinite(sum) ? sum : 0;
  }, [humanRows]);

  const nonHumanCostBRL = useMemo(() => {
    const sum = costItems.reduce((acc, it) => acc + n(it.amount_brl), 0);
    return Number.isFinite(sum) ? sum : 0;
  }, [costItems]);

  const totalCostBRL = useMemo(() => humanCostBRL + nonHumanCostBRL, [humanCostBRL, nonHumanCostBRL]);

  const plannedProfit = typeof objective.expected_profit_brl === "number" ? objective.expected_profit_brl : null;
  const plannedProfitThesis = objective.profit_thesis ?? null;
  const plannedRevenueAt = objective.expected_revenue_at ?? "";

  const plannedRoiPct = useMemo(() => roiPct(plannedProfit, totalCostBRL), [plannedProfit, totalCostBRL]);

  // Tier 2 editors
  const [addOpen, setAddOpen] = useState(false);
  const [pickUserId, setPickUserId] = useState<string>("");
  const [hours, setHours] = useState<string>("");
  const [roleLabel, setRoleLabel] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [savingHuman, setSavingHuman] = useState(false);

  const resetAdd = () => {
    setPickUserId("");
    setHours("");
    setRoleLabel("");
    setNotes("");
  };

  const [profit, setProfit] = useState<string>(plannedProfit !== null ? String(plannedProfit) : "");
  const [thesis, setThesis] = useState<string>(plannedProfitThesis ?? "");
  const [revenueAt, setRevenueAt] = useState<string>(plannedRevenueAt);
  const [savingProfit, setSavingProfit] = useState(false);

  useEffect(() => {
    setProfit(plannedProfit !== null ? String(plannedProfit) : "");
    setThesis(plannedProfitThesis ?? "");
    setRevenueAt(plannedRevenueAt);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [objective.id, objective.expected_profit_brl, objective.profit_thesis, objective.expected_revenue_at]);

  const saveProfit = async () => {
    const p = profit.trim() ? parsePtNumber(profit) : null;
    if (profit.trim() && p === null) {
      toast({ title: "Lucro inválido", description: "Informe um número (ex.: 50000).", variant: "destructive" });
      return;
    }

    try {
      setSavingProfit(true);
      await updateOkrObjective(objective.id, {
        expected_profit_brl: p,
        profit_thesis: thesis.trim() || null,
        expected_revenue_at: revenueAt.trim() || null,
      });
      await qc.invalidateQueries({ queryKey: ["okr-objective", objective.id] });
      toast({ title: "Business case atualizado" });
    } catch (e) {
      toast({
        title: "Não foi possível salvar",
        description: e instanceof Error ? e.message : "Erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setSavingProfit(false);
    }
  };

  // Non-human costs modal (create/edit) — Tier 2 only
  const [costOpen, setCostOpen] = useState(false);
  const [editingCostId, setEditingCostId] = useState<string | null>(null);
  const [costTitle, setCostTitle] = useState("");
  const [costAmount, setCostAmount] = useState("");
  const [costNotes, setCostNotes] = useState("");
  const [costSaving, setCostSaving] = useState(false);

  const resetCost = () => {
    setEditingCostId(null);
    setCostTitle("");
    setCostAmount("");
    setCostNotes("");
  };

  const openCreateCost = () => {
    resetCost();
    setCostOpen(true);
  };

  const openEditCost = (it: { id: string; title: string; amount_brl: number; notes: string | null }) => {
    setEditingCostId(it.id);
    setCostTitle(it.title);
    setCostAmount(String(Number(it.amount_brl) || 0));
    setCostNotes(it.notes ?? "");
    setCostOpen(true);
  };

  const saveCost = async () => {
    if (!canWrite) return;
    if (isTier1) return;

    const value = parsePtNumber(costAmount);
    if (value === null) {
      toast({ title: "Valor inválido", description: "Informe um número (ex.: 1200).", variant: "destructive" });
      return;
    }

    try {
      setCostSaving(true);
      if (editingCostId) {
        await updateObjectiveCostItem(editingCostId, {
          title: costTitle,
          amount_brl: value,
          notes: costNotes.trim() || null,
        });
      } else {
        await createObjectiveCostItem({
          objective_id: objective.id,
          title: costTitle,
          amount_brl: value,
          notes: costNotes.trim() || null,
        });
      }
      await qc.invalidateQueries({ queryKey: ["okr-objective-cost-items", objective.id] });
      setCostOpen(false);
    } catch (e) {
      toast({
        title: "Não foi possível salvar",
        description: e instanceof Error ? e.message : "Erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setCostSaving(false);
    }
  };

  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Business case (custos + retorno + ROI)</div>
          <p className="mt-1 text-sm text-muted-foreground">
            {isTier1
              ? "No Tier 1, os custos vêm automaticamente dos OKRs Tier 2 vinculados. Aqui você só define quando pretende faturar e qual lucro espera ao atingir este objetivo."
              : "No Tier 2, registre custos humanos (pessoas + horas), custos não-humanos (opex) e retorno esperado (lucro + tese)."}
          </p>
        </div>
        <div className="grid h-11 w-11 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
          <TrendingUp className="h-5 w-5" />
        </div>
      </div>

      <Separator className="my-5" />

      {isTier1 ? (
        <div className="mb-5 rounded-3xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Custos do Tier 1 (vindos do Tier 2)</div>
              <p className="mt-1 text-sm text-muted-foreground">
                {linkedObjectives.length
                  ? `Somando custos de ${linkedObjectives.length} OKR(s) Tier 2 vinculado(s).`
                  : "Nenhum OKR Tier 2 vinculado ainda. Vincule OKRs aos KRs para calcular o ROI corretamente."}
              </p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 text-xs text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]">
              <Link2 className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
              Alinhamento via KRs
            </div>
          </div>

          {linkedObjectives.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {linkedObjectives.map((o) => (
                <span
                  key={o.id}
                  className="inline-flex items-center rounded-full border border-[color:var(--sinaxys-border)] bg-white px-3 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)]"
                >
                  {o.title}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      ) : null}

      {/* Costs summary */}
      <div className="grid gap-2 md:grid-cols-3">
        <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 ring-1 ring-[color:var(--sinaxys-border)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Custo humano</div>
              <div className="mt-1 text-sm font-semibold text-[color:var(--sinaxys-ink)]">{brl(humanCostBRL)}</div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white ring-1 ring-[color:var(--sinaxys-border)]">
              <Users className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">Pessoas do time × horas × custo/h.</div>
        </div>

        <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 ring-1 ring-[color:var(--sinaxys-border)]">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-muted-foreground">Custos não-humanos</div>
              <div className="mt-1 text-sm font-semibold text-[color:var(--sinaxys-ink)]">{brl(nonHumanCostBRL)}</div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white ring-1 ring-[color:var(--sinaxys-border)]">
              <Wallet className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
          </div>
          <div className="mt-2 text-[11px] text-muted-foreground">Ferramentas, fornecedores, mídia, infraestrutura etc.</div>
        </div>

        <div className="rounded-2xl bg-[color:var(--sinaxys-primary)] p-4 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-white/80">Custo total</div>
              <div className="mt-1 text-sm font-semibold">{brl(totalCostBRL)}</div>
            </div>
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/15">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-2 text-[11px] text-white/80">Base do ROI.</div>
        </div>
      </div>

      {/* Human cost editor (Tier 2 only) */}
      {!isTier1 ? (
        <div className="mt-6 rounded-3xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Time + horas (custo humano)</div>
              <p className="mt-1 text-sm text-muted-foreground">Escolha as pessoas e estime horas por pessoa.</p>
            </div>
            {canWrite ? (
              <Button
                className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                onClick={() => {
                  resetAdd();
                  setAddOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar pessoa
              </Button>
            ) : null}
          </div>

          <div className="mt-4 grid gap-3">
            {humanRows.length ? (
              humanRows.map((r) => (
                <div key={r.id} className="flex items-start justify-between gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="grid h-9 w-9 place-items-center rounded-xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                        <span className="text-xs font-bold">{initials(r.name)}</span>
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{r.name}</div>
                        <div className="mt-0.5 text-xs text-muted-foreground">
                          {r.jobTitle ? `${r.jobTitle} • ` : ""}
                          {r.monthlyCostBRL ? `Custo: ${brlPerHourFromMonthly(r.monthlyCostBRL)}` : "Custo/h: — (cadastre em Custos)"}
                        </div>
                      </div>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2 text-sm">
                      <span className="text-muted-foreground">Horas:</span>
                      <span className="font-semibold text-[color:var(--sinaxys-ink)]">{r.hours}</span>
                      <span className="text-muted-foreground">• Custo:</span>
                      <span className="font-semibold text-[color:var(--sinaxys-ink)]">{r.cost !== null ? brl(r.cost) : "—"}</span>
                    </div>

                    {r.roleLabel?.trim() ? <div className="mt-2 text-xs text-muted-foreground">Papel: {r.roleLabel}</div> : null}
                    {r.notes?.trim() ? <div className="mt-1 text-sm text-muted-foreground">{r.notes}</div> : null}
                  </div>

                  {canWrite ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-9 w-9 rounded-xl text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
                      title="Remover"
                      onClick={async () => {
                        try {
                          await deleteObjectiveLaborAllocation(r.id);
                          await qc.invalidateQueries({ queryKey: ["okr-objective-labor", objective.id] });
                        } catch (e) {
                          toast({
                            title: "Não foi possível remover",
                            description: e instanceof Error ? e.message : "Erro inesperado.",
                            variant: "destructive",
                          });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-white p-4 text-sm text-muted-foreground">Nenhuma pessoa adicionada ainda.</div>
            )}
          </div>

          <div className="mt-4 rounded-2xl bg-white p-4 ring-1 ring-[color:var(--sinaxys-border)]">
            <div className="text-xs text-muted-foreground">Dica</div>
            <div className="mt-1 text-sm text-[color:var(--sinaxys-ink)]">
              Se o custo/h aparecer como "—", vá em <span className="font-semibold">Custos</span> e cadastre o custo mensal da pessoa.
            </div>
          </div>
        </div>
      ) : null}

      {/* Non-human costs (Tier 2 only) */}
      {!isTier1 ? (
        <div className="mt-6 rounded-3xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4">
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Custos extras (não-humanos)</div>
              <p className="mt-1 text-sm text-muted-foreground">Ferramentas, fornecedores, mídia, deslocamento, infraestrutura etc.</p>
            </div>
            {canWrite ? (
              <Button
                className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                onClick={openCreateCost}
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar custo
              </Button>
            ) : null}
          </div>

          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="text-sm">
              <span className="text-muted-foreground">Total:</span>{" "}
              <span className="font-semibold text-[color:var(--sinaxys-ink)]">{brl(nonHumanCostBRL)}</span>
            </div>
            {canWrite ? <div className="text-xs text-muted-foreground">Clique em um item para editar.</div> : null}
          </div>

          <div className="mt-4 grid gap-3">
            {loadingCostItems ? (
              <div className="rounded-2xl bg-white p-4 text-sm text-muted-foreground">Carregando…</div>
            ) : costItems.length ? (
              costItems.map((it) => (
                <div
                  key={it.id}
                  role={canWrite ? "button" : undefined}
                  tabIndex={canWrite ? 0 : -1}
                  className={
                    "flex items-start justify-between gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4 transition " +
                    (canWrite ? " cursor-pointer hover:bg-[color:var(--sinaxys-tint)]/35" : "")
                  }
                  onClick={() => {
                    if (!canWrite) return;
                    openEditCost(it);
                  }}
                  title={canWrite ? "Clique para editar" : undefined}
                >
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{it.title}</div>
                    <div className="mt-1 text-sm text-muted-foreground">{brl(n(it.amount_brl))}</div>
                    {it.notes?.trim() ? <div className="mt-2 text-sm text-muted-foreground">{it.notes}</div> : null}
                  </div>
                  {canWrite ? (
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-[color:var(--sinaxys-tint)] hover:text-[color:var(--sinaxys-ink)]"
                        title="Editar"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditCost(it);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-9 w-9 rounded-xl text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
                        title="Excluir"
                        onClick={async (e) => {
                          e.stopPropagation();
                          try {
                            await deleteObjectiveCostItem(it.id);
                            await qc.invalidateQueries({ queryKey: ["okr-objective-cost-items", objective.id] });
                          } catch (e2) {
                            toast({
                              title: "Não foi possível excluir",
                              description: e2 instanceof Error ? e2.message : "Erro inesperado.",
                              variant: "destructive",
                            });
                          }
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <div className="rounded-2xl bg-white p-4 text-sm text-muted-foreground">Nenhum custo extra cadastrado.</div>
            )}
          </div>
        </div>
      ) : null}

      {/* Profit & thesis (Tier 1 + Tier 2) */}
      <div className="mt-6 rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-5">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Retorno esperado</div>
            <p className="mt-1 text-sm text-muted-foreground">
              {isTier1
                ? "Quando pretendemos faturar com este objetivo (se atingirmos) e qual lucro esperamos."
                : "Quanto pretendemos lucrar com isso (se atingirmos) e como."}
            </p>
          </div>
          <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] px-3 py-2 text-xs text-[color:var(--sinaxys-ink)]">
            ROI (se atingirmos): {plannedRoiPct !== null ? `${plannedRoiPct.toFixed(1)}%` : "—"}
          </div>
        </div>

        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="grid gap-3">
            {isTier1 ? (
              <div className="grid gap-2">
                <Label>Quando pretendemos faturar</Label>
                <Input className="h-11 rounded-xl" type="date" value={revenueAt} onChange={(e) => setRevenueAt(e.target.value)} />
                <div className="text-xs text-muted-foreground">Ex.: mês/ano em que o efeito financeiro começa a aparecer.</div>
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label>Lucro pretendido (R$)</Label>
              <Input className="h-11 rounded-xl" value={profit} onChange={(e) => setProfit(e.target.value)} placeholder="50000" />
              <div className="text-xs text-muted-foreground">Use lucro (e não faturamento) para o ROI ficar mais realista.</div>
            </div>
          </div>

          <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 ring-1 ring-[color:var(--sinaxys-border)]">
            <div className="text-xs text-muted-foreground">ROI (se atingirmos)</div>
            <div className="mt-1 text-lg font-semibold text-[color:var(--sinaxys-ink)]">
              {plannedRoiPct !== null ? `${plannedRoiPct.toFixed(1)}%` : "—"}
            </div>
            <div className="mt-2 text-[11px] text-muted-foreground">ROI = (lucro − custo total) / custo total.</div>
          </div>
        </div>

        <div className="mt-4 grid gap-2">
          <Label>Tese (como pretendemos lucrar)</Label>
          <Textarea
            className="min-h-[96px] rounded-2xl"
            value={thesis}
            onChange={(e) => setThesis(e.target.value)}
            placeholder="Ex.: reduzir churn em X% através de..., ou aumentar conversão em..., ou reduzir custo operacional em..."
          />
        </div>

        {canWrite ? (
          <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={savingProfit}
              onClick={saveProfit}
            >
              Salvar retorno
            </Button>
          </div>
        ) : null}
      </div>

      {/* Human add dialog (Tier 2 only) */}
      <Dialog
        open={addOpen}
        onOpenChange={(v) => {
          setAddOpen(v);
          if (!v) resetAdd();
        }}
      >
        <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Adicionar pessoa ao time</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Pessoa</Label>
              <Select value={pickUserId} onValueChange={(v) => setPickUserId(v)}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  <SelectItem value={SELECT_NONE}>Selecione</SelectItem>
                  {profiles
                    .filter((p) => p.active)
                    .map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {(p.name ?? p.email) + (p.job_title ? ` — ${p.job_title}` : "")}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Horas estimadas</Label>
              <Input className="h-11 rounded-xl" value={hours} onChange={(e) => setHours(e.target.value)} placeholder="12" />
            </div>

            <div className="grid gap-2">
              <Label>Papel (opcional)</Label>
              <Input className="h-11 rounded-xl" value={roleLabel} onChange={(e) => setRoleLabel(e.target.value)} placeholder="Ex.: Engenheiro(a), Designer" />
            </div>

            <div className="grid gap-2">
              <Label>Notas (opcional)</Label>
              <Textarea className="min-h-[88px] rounded-2xl" value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <DialogFooter className="mt-2 gap-2 sm:gap-0">
            <Button variant="outline" className="h-11 rounded-xl" onClick={() => setAddOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={
                savingHuman ||
                !canWrite ||
                !pickUserId ||
                pickUserId === SELECT_NONE ||
                parsePtNumber(hours) === null ||
                (parsePtNumber(hours) ?? 0) <= 0
              }
              onClick={async () => {
                if (!canWrite) return;
                const h = parsePtNumber(hours);
                if (h === null || h <= 0) return;

                try {
                  setSavingHuman(true);
                  await upsertObjectiveLaborAllocation({
                    objective_id: objective.id,
                    user_id: pickUserId,
                    hours_estimated: Number(h.toFixed(2)),
                    role_label: roleLabel.trim() || null,
                    notes: notes.trim() || null,
                  });
                  await qc.invalidateQueries({ queryKey: ["okr-objective-labor", objective.id] });
                  setAddOpen(false);
                } catch (e) {
                  toast({
                    title: "Não foi possível salvar",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                } finally {
                  setSavingHuman(false);
                }
              }}
            >
              Adicionar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Non-human cost dialog (Tier 2 only) */}
      <Dialog
        open={costOpen}
        onOpenChange={(v) => {
          setCostOpen(v);
          if (!v) resetCost();
        }}
      >
        <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{editingCostId ? "Editar custo extra" : "Novo custo extra"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Nome</Label>
              <Input className="h-11 rounded-xl" value={costTitle} onChange={(e) => setCostTitle(e.target.value)} placeholder="Ex.: Licença do CRM" />
            </div>
            <div className="grid gap-2">
              <Label>Valor estimado (R$)</Label>
              <Input className="h-11 rounded-xl" value={costAmount} onChange={(e) => setCostAmount(e.target.value)} placeholder="1200" />
            </div>
            <div className="grid gap-2">
              <Label>Notas (opcional)</Label>
              <Textarea className="min-h-[88px] rounded-2xl" value={costNotes} onChange={(e) => setCostNotes(e.target.value)} />
            </div>
          </div>

          <DialogFooter className="mt-2 gap-2 sm:gap-0">
            <Button variant="outline" className="h-11 rounded-xl" onClick={() => setCostOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={isTier1 || costSaving || !canWrite || costTitle.trim().length < 3 || parsePtNumber(costAmount) === null}
              onClick={saveCost}
            >
              {editingCostId ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}