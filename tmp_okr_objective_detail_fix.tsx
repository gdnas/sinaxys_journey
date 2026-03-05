import { PerformanceIndicatorEditor } from "@/components/okr/PerformanceIndicatorEditor";
import { TierBadge } from "@/components/okr/TierBadge";
import { useSyncAcrossViews } from "@/hooks/useSyncAcrossViews";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import {
  createDeliverable,
  getOkrObjective,
  krProgressPct,
  listDeliverablesByKeyResultIds,
  listKeyResults,
  listOkrCycles,
  listOkrObjectives,
  listOkrObjectivesByIds,
  listTasksByDeliverableIds,
  updateKeyResult,
  updateOkrObjective,
  updateTask,
  type DbDeliverable,
  type DbOkrKeyResult,
  type DbTask,
  type DeliverableTier,
  type WorkStatus,
  deleteKeyResultCascade,
  deleteOkrObjectiveCascade,
} from "@/lib/okrDb";
import { linkObjectiveToKr, listLinkedObjectivesByKrIds, listKrLinksByObjectiveId, unlinkObjectiveFromKr } from "@/lib/okrAlignmentDb";
import { OkrPageHeader } from "@/components/OkrPageHeader";
import { OkrSubnav } from "@/components/OkrSubnav";
import { OkrObjectiveBusinessCase } from "@/components/okr/OkrObjectiveBusinessCase";
import { objectiveLevelLabel, objectiveTypeBadgeClass, objectiveTypeLabel } from "@/lib/okrUi";

const SELECT_NONE = "__none__";

function statusLabel(s: WorkStatus) {
  if (s === "DONE") return "Concluído";
  if (s === "IN_PROGRESS") return "Em andamento";
  return "A fazer";
}

function fmtDate(d?: string | null) {
  if (!d) return null;
  const asDate = new Date(d);
  if (Number.isNaN(asDate.getTime())) return d;
  return asDate.toLocaleDateString("pt-BR");
}

function fmtMetricValue(v: number | null) {
  if (typeof v !== "number" || !Number.isFinite(v)) return "—";
  return new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(v);
}

function sumDescendantCosts(objectiveId: string, objectives: { id: string; parent_objective_id: string | null; estimated_cost_brl: number | null }[]) {
  const childrenByParent = new Map<string, string[]>();
  for (const o of objectives) {
    if (!o.parent_objective_id) continue;
    const arr = childrenByParent.get(o.parent_objective_id) ?? [];
    arr.push(o.id);
    childrenByParent.set(o.parent_objective_id, arr);
  }

  const costById = new Map<string, number>();
  for (const o of objectives) {
    if (typeof o.estimated_cost_brl === "number" && Number.isFinite(o.estimated_cost_brl)) {
      costById.set(o.id, o.estimated_cost_brl);
    }
  }

  const visited = new Set<string>();

  const dfs = (id: string): number => {
    if (visited.has(id)) return 0;
    visited.add(id);
    let sum = costById.get(id) || 0;
    const children = childrenByParent.get(id) || [];
    for (const childId of (children || [])) {
      sum += dfs(childId);
    }
    return sum;
  };

  const costOfDescendants = dfs(objectiveId);
  return costOfDescendants + (costById.get(objectiveId) || 0);
}

export default function OkrObjectiveDetail() {
  const { objectiveId } = useParams<{ id: string }>();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { enabled: okrRoiEnabled } = useCompanyModuleEnabled("OKR_ROI");
  const { user } = useAuth();
  const { companyId } = useCompany();

  if (!user) return null;

  const cid = companyId ?? "";
  const hasCompany = !!companyId;
  const isAdminish = user.role === "ADMIN" || user.role === "HEAD" || user.role === "MASTERADMIN";

  const { data: objective } = useQuery({
    queryKey: ["okr-objective", objectiveId],
    enabled: hasCompany && !!objectiveId,
    queryFn: async () => getOkrObjective(objectiveId),
  });

  const tier = objective?.level === "COMPANY" ? "TIER1" : "TIER2";

  // Sincronizar views quando o objetivo muda
  useSyncAcrossViews({ objectiveId: objectiveId ? [objectiveId] : [] });

  const { data: fundamentals } = useQuery({
    queryKey: ["okr-fundamentals", cid],
    enabled: hasCompany,
    queryFn: () => getCompanyFundamentals(cid),
  });

  const { data: cycles } = useQuery({
    queryKey: ["okr-cycles", cid],
    enabled: hasCompany,
    queryFn: () => listOkrCycles(cid),
  });

  const { data: strategyObjectives = [] } = useQuery({
    queryKey: ["okr-strategy", cid],
    enabled: hasCompany,
    queryFn: () => listStrategyObjectives(cid),
    staleTime: 60_000,
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles", cid],
    enabled: hasCompany,
    queryFn: () => listProfilesByCompany(cid),
    staleTime: 60_000,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments", cid],
    enabled: hasCompany,
    queryFn: () => [],
  });

  const { data: krs = [] } = useQuery({
    queryKey: ["okr-krs", objectiveId],
    enabled: hasCompany && !!objectiveId,
    queryFn: () => listKeyResults(objectiveId),
  });

  const { data: deliverables = [] } = useQuery({
    queryKey: ["okr-deliverables", objectiveId],
    enabled: hasCompany && !!objectiveId,
    queryFn: () => {
      const d = await listDeliverablesByKeyResultIds(krs.map(k => k.id));
      return d.sort((a, b) => (a.tier === "TIER2" ? 1 : -1) || (a.tier === "TIER1" ? -1 : 1) || (a.due_at || "").localeCompare(b.due_at || ""));
    },
    staleTime: 0,
    refetchOnMount: "always",
  });

  const { data: tasks = [] } = useQuery({
    queryKey: ["okr-tasks", deliverables.map(d => d.id).join(",")],
    enabled: !!objectiveId && deliverables.length > 0,
    queryFn: async () => {
      const ids = deliverables.map(d => d.id);
      return listTasksByDeliverableIds(ids);
    },
  });

  const { data: indicatorDepartments } = useQuery({
    queryKey: ["indicator-departments", objectiveId],
    enabled: hasCompany && !!objectiveId && okrRoiEnabled,
    queryFn: async () => [],
  });

  const { data: objectiveDepartments } = useQuery({
    queryKey: ["objective-departments", objectiveId],
    enabled: hasCompany && !!objectiveId,
    queryFn: async () => [],
  });

  const { data: tier2StatsByObjectiveId = new Map<string, { count: number; pct: number | null }>() } = useQuery({
    queryKey: ["okr-tier2-stats", objectiveId, deliverables.map(d => d.id).join(",")],
    enabled: hasCompany && !!objectiveId && deliverables.length > 0,
    queryFn: async () => {
      const m = new Map<string, { count: number; pct: number | null }>();
      await Promise.all(
        deliverables.map(async (d) => {
          const ks = await listKeyResults(d.key_result_id);
          const pcts = ks
            .map((k) => krProgressPct(k))
            .filter((v): v is number && Number.isFinite(v));
          const pct = pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
          m.set(d.key_result_id, { count: ks.length, pct });
        }),
      );
      return m;
    },
  });

  const byUserId = useMemo(() => {
    return new Map((profiles ?? []).map((p) => [p.id, (p.name ?? p.email)]));
  }, [profiles]);

  const deptNameById = useMemo(() => {
    return new Map((departments ?? []).map((d) => [d.id, d.name]));
  }, [departments]);

  const canWrite = useMemo(() => {
    if (!objective) return false;
    if (user.role === "MASTERADMIN") return true;
    return isAdminish || objective.owner_user_id === user.id;
  }, [objective, user.id, user.role]);

  const isTier1 = tier === "TIER1";
  const isTier2 = tier === "TIER2";

  return (
    <div className="space-y-6">
      <OkrPageHeader
        title="Detalhes do Objetivo"
        subtitle={objective?.title ?? "Carregando…"}
        icon={<Target className="h-5 w-5" />}
        actions={
          <>
            {objective ? (
              <Button
                asChild
                variant="outline"
                className="h-11 rounded-xl bg-white"
              >
                <Link to={`/okr/cycles` className="h-full w-full justify-center">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Link>
              </Button>
            ) : (
              <Button
                asChild
                variant="outline"
                className="h-11 rounded-xl bg-white"
              >
                <Link to={`/okr/quarter` className="h-full w-full justify-center">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Link>
              </Button>
            )}
            {canWrite ? (
              <Button
                variant="destructive"
                className="h-11 rounded-xl"
                onClick={async () => {
                  if (!objective) return;
                  try {
                    await deleteOkrObjectiveCascade(objective.id);
                    toast({ title: "Objetivo excluído", description: "Objetivo e todos os KRs, Entregáveis e Tarefas foram excluídos com sucesso." });
                    window.location.href = "/okr/quarter";
                  } catch (e) {
                    toast({ title: "Não foi possível excluir", description: e instanceof Error ? e.message : "Erro inesperado.", variant: "destructive" });
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Excluir
              </Button>
            ) : null}
          </>
        }
      </div>

      {!objective || !hasCompany ? (
        <div className="flex items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-muted-foreground/20 border-t-2"></div>
          <p className="text-sm text-muted-foreground">Carregando detalhes…</p>
        </div>
      ) : (
        <>
          {/* Título e Tier Badge */}
          <div className="flex items-center gap-2 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-[color:var(--sinaxys-ink)]">
                {objective?.title}
              </h1>
              <TierBadge tier={tier} size="lg" />
            </div>
            <Badge
              variant={objective?.status === "ACHIEVED" ? "destructive" : "default"}
              className="rounded-full px-3 py-1"
            >
              {statusLabel(objective.status)}
            </Badge>
          </div>

          {/* Informações Básicas */}
          <Card className="rounded-2xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <div className="space-y-2">
                  <Label htmlFor="obj-title" className="text-sm font-medium text-[color:var(--sinaxys-ink)]">Título</Label>
                  <Input
                    id="obj-title"
                    value={objective.title || ""}
                    disabled={!canWrite}
                    onChange={(e) => updateOkrObjective(objective.id, { title: e.target.value })}
                    className="rounded-xl h-11"
                  />
                  <p className="text-xs text-muted-foreground">
                    Dica: um bom objetivo é claro e aspiracional (evite \"melhorar\" sem contexto).
                  </p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="obj-desc" className="text-sm font-medium text-[color:var(--sinaxys-ink)]">Descrição</Label>
                  <Textarea
                    id="obj-desc"
                    value={objective.description || ""}
                    disabled={!canWrite}
                    onChange={(e) => updateOkrObjective(objective.id, { description: e.target.value })}
                    className="min-h-[92px] rounded-2xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="space-y-2">
                  <Label htmlFor="obj-strategic-reason" className="text-sm font-medium text-[color:var(--sinaxys-ink)]">Motivo estratégico (opcional)</Label>
                  <Textarea
                    id="obj-strategic-reason"
                    value={objective.strategic_reason || ""}
                    disabled={!canWrite}
                    onChange={(e) => updateOkrObjective(objective.id, { strategic_reason: e.target.value })}
                    className="min-h-[92px] rounded-2xl"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="grid gap-2">
                  <div>
                    <Label htmlFor="obj-owner" className="text-sm font-medium text-[color:var(--sinaxys-ink)]">Responsável</Label>
                    <Select
                      id="obj-owner"
                      value={objective.owner_user_id}
                      onValueChange={(v) => updateOkrObjective(objective.id, { owner_user_id: v || null })}
                      disabled={!canWrite}
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SELECT_NONE}>Sem responsável</SelectItem>
                        {profiles.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            {(p.name ?? p.email) + (p.role ? ` (${p.role})` : \"\")}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="obj-tier" className="text-sm font-medium text-[color:var(--sinaxys-ink)]">Tier</Label>
                    <Select
                      id="obj-tier"
                      value={objective?.tier}
                      onValueChange={(v) => updateOkrObjective(objective.id, { tier: v || 'TIER1' })} // TODO: add tier field
                    >
                      <SelectTrigger className="h-11 rounded-xl">
                        <SelectValue placeholder="Tier" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TIER1">Estratégico (Tier 1)</SelectItem>
                        <SelectItem value="TIER2">Tático (Tier 2)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </Card>

            {/* Resultados-chave (KRs) */}
            <Card className="rounded-2xl border-[color:var(--sinaxys-border)] bg-white p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <KeyRound className="h-5 w-5 text-primary" />
                  <h2 className="text-lg font-semibold text-[color:var(--sinaxys-ink)]">Resultados-chave & Entregáveis</h2>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    resetKr();
                    setKrOpen(true);
                    setKrObjectiveId(objective.id);
                  }}
                  disabled={!canWrite}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Novo KR
                </Button>
              </div>

              {krs.length ? (
                <div className="space-y-2">
                  {krs.map((kr) => {
                    const pct = krProgressPct(kr);
                    const isDone = kr.achieved;

                    return (
                      <div key={kr.id} className="grid gap-2">
                        <div
                          className="p-4 border-2xl border-[color:var(--sinaxys-border)] rounded-2xl bg-white hover:border-[color:var(--sinaxys-primary)]/30 transition-colors"
                        >
                          <div className="grid gap-3">
                            <div className="flex items-start gap-3">
                              <button
                                type="button"
                                className="min-w-0 flex-1 text-left"
                                onClick={() => {
                                  if (!canWrite) return;
                                  setEditingKr(kr);
                                }}
                              >
                                <div className="flex flex-wrap items-center gap-2">
                                  <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)] hover:bg-[color:var(--sinaxys- tint)]">
                                    <KeyRound className="mr-1.5 h-3.5 w-3.5" />
                                    KR
                                  </Badge>
                                  <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)] hover:bg-white\">
                                    {kindLabel(kr.kind)}
                                  </Badge>
                                  <Badge
                                    className={`rounded-full ${kr.confidence === "ON_TRACK" ? "bg-emerald-500/10 text-emerald-700 ring-1 ring-emerald-500/20 dark:text-emerald-200" : kr.confidence === "AT_RISK" ? "bg-amber-500/10 text-amber-800 ring-1 ring-amber-500/20 dark:text-amber-200" : "bg-rose-500/10 text-rose-700 ring-1 ring-rose-500/20 dark:text-rose-200"`}
                                  >
                                    {confidenceLabel(kr.confidence)}
                                  </Badge>
                                  {isDone && (
                                    <span className="text-green-600 dark:text-green-400 font-medium text-sm">✓ Concluído</span>
                                  )}
                                </div>
                                <span className="text-xs text-muted-foreground opacity-0 transition group-hover:opacity-100">Clique para editar</span>
                              </button>
                            </div>

                            <div className="flex-1">
                              <h3 className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{kr.title}</h3>
                              <div className="mt-1 text-xs text-muted-foreground">
                                {kr.kind === "METRIC" ? `${kr.current_value ?? "—"} / ${kr.target_value}` : kr.metric_unit || "N/A"}
                              </div>
                            </div>

                            {typeof pct === "number" ? (
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">{kr.metric_unit}</span>
                                <span className="font-semibold">{pct}%</span>
                              </div>
                            )}

                            {/* Controles rápidos */}
                            <div className="flex items-center gap-2 pt-2 border-t">
                              {!isDone && (
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    toast({ title: "Marcar como atingido", description: "Status de atingido alterado." });
                                  }}
                                  disabled={!canWrite}
                                >
                                  Marcar como atingido
                                </Button>
                              )}

                              <Select
                                value={kr.confidence}
                                onValueChange={(value) => {
                                  updateKeyResult(kr.id, { confidence: value });
                                }}
                                disabled={!canWrite || isDone}
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="ON_TRACK">No rumo</SelectItem>
                                  <SelectItem value="AT_RISK">Em risco</SelectItem>
                                  <SelectItem value="OFF_TRACK">Fora do rumo</SelectItem>
                                </SelectContent>
                              </Select>

                              {kr.kind === "METRIC" && !isDone && (
                                <Input
                                  type="number"
                                  placeholder="Atual"
                                  value={kr.current_value ?? ""}
                                  onChange={(e) => {
                                    const val = Number(e.target.value);
                                    updateKeyResult(kr.id, { current_value: val || null });
                                  }}
                                  disabled={!canWrite}
                                  className="w-32"
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4 text-sm text-muted-foreground">
                    Nenhum KR neste objetivo ainda.
                  </div>
                )}
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
