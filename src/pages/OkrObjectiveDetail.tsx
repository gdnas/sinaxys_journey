import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Circle, ChevronDown, ChevronUp, ListChecks, KeyRound, Pencil, Plus, Target, Trash2, Link2, Unlink2 } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useCompanyModuleEnabled } from "@/hooks/useCompanyModuleEnabled";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { brl } from "@/lib/costs";
import { parsePtNumber } from "@/lib/roi";
import { listProfilesByCompany } from "@/lib/profilesDb";
import {
  createDeliverable,
  createTask,
  deleteTask,
  getOkrObjective,
  krProgressPct,
  listDeliverablesByKeyResultIds,
  listKeyResults,
  listTasksByDeliverableIds,
  listOkrCycles,
  listOkrObjectives,
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
import { linkObjectiveToKr, listLinkedObjectivesByKrIds, unlinkObjectiveFromKr } from "@/lib/okrAlignmentDb";

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
  const stack = [...(childrenByParent.get(objectiveId) ?? [])];
  let sum = 0;

  while (stack.length) {
    const id = stack.pop()!;
    if (visited.has(id)) continue;
    visited.add(id);
    sum += costById.get(id) ?? 0;
    const children = childrenByParent.get(id) ?? [];
    for (const c of children) stack.push(c);
  }

  return sum;
}

export default function OkrObjectiveDetail() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { objectiveId } = useParams();
  const { user } = useAuth();
  const { companyId } = useCompany();
  const { enabled: okrRoiEnabled } = useCompanyModuleEnabled("OKR_ROI");

  if (!objectiveId || !user) return null;

  const cid = companyId ?? "";
  const hasCompany = !!companyId;

  const { data: objective, isLoading: loadingObjective } = useQuery({
    queryKey: ["okr-objective", objectiveId],
    queryFn: () => getOkrObjective(objectiveId),
  });

  const { data: krs = [] } = useQuery({
    queryKey: ["okr-krs", objectiveId],
    queryFn: () => listKeyResults(objectiveId),
  });

  const krIds = useMemo(() => krs.map((k) => k.id), [krs]);

  const { data: krObjectiveLinks = [] } = useQuery({
    queryKey: ["okr-kr-objective-links", objectiveId, krIds.join(",")],
    enabled: krIds.length > 0,
    queryFn: () => listLinkedObjectivesByKrIds(krIds),
  });

  const linkedObjectiveIdsByKrId = useMemo(() => {
    const m = new Map<string, Set<string>>();
    for (const l of krObjectiveLinks) {
      const set = m.get(l.key_result_id) ?? new Set<string>();
      set.add(l.objective_id);
      m.set(l.key_result_id, set);
    }
    return m;
  }, [krObjectiveLinks]);

  const linkedObjectiveLinksByKrId = useMemo(() => {
    const m = new Map<string, { id: string; objectiveId: string }[]>();
    for (const l of krObjectiveLinks) {
      const arr = m.get(l.key_result_id) ?? [];
      arr.push({ id: l.id, objectiveId: l.objective_id });
      m.set(l.key_result_id, arr);
    }
    return m;
  }, [krObjectiveLinks]);

  const { data: objectivesInCycle = [] } = useQuery({
    queryKey: ["okr-cycle-objectives", cid, objective?.cycle_id],
    enabled: hasCompany && !!objective?.cycle_id,
    queryFn: () => listOkrObjectives(cid, objective!.cycle_id),
    staleTime: 20_000,
  });

  const { data: cycles = [] } = useQuery({
    queryKey: ["okr-cycles", cid],
    enabled: hasCompany,
    queryFn: () => listOkrCycles(cid),
    staleTime: 60_000,
  });

  const cycleById = useMemo(() => {
    const m = new Map<string, { type: string; year: number; quarter: number | null }>();
    for (const c of cycles) m.set(c.id, { type: c.type, year: c.year, quarter: c.quarter });
    return m;
  }, [cycles]);

  const { data: parentObjective } = useQuery({
    queryKey: ["okr-objective", objective?.parent_objective_id],
    enabled: !!objective?.parent_objective_id,
    queryFn: () => getOkrObjective(objective!.parent_objective_id as string),
    staleTime: 20_000,
  });

  const deliverableTierAuto: DeliverableTier = useMemo(() => {
    if (!objective) return "TIER1";

    // Tier 2: vinculado a OKR estratégico (objetivo de longo prazo)
    if (objective.strategy_objective_id) return "TIER2";

    // Tier 1: no trimestre, vinculado ao OKR do ano (via objetivo pai anual)
    const cycle = cycleById.get(objective.cycle_id);
    if (cycle?.type === "QUARTERLY" && parentObjective) {
      const parentCycle = cycleById.get(parentObjective.cycle_id);
      if (parentCycle?.type === "ANNUAL") return "TIER1";
    }

    return "TIER1";
  }, [cycleById, objective, parentObjective]);

  const isTier1 = deliverableTierAuto === "TIER1";

  const tier2LinkCandidates = useMemo(() => {
    if (!objective) return [] as { id: string; title: string; level: string; department_id: string | null }[];

    // Candidates: objectives in the SAME cycle that are not this objective, and are non-company (dept/team/individual).
    // This covers Tier 2 OKRs.
    return objectivesInCycle
      .filter((o) => o.id !== objective.id)
      .filter((o) => o.level !== "COMPANY")
      .map((o) => ({ id: o.id, title: o.title, level: o.level, department_id: o.department_id }));
  }, [objective, objectivesInCycle]);

  const objectiveTitleById = useMemo(() => {
    const m = new Map<string, string>();
    for (const o of objectivesInCycle) m.set(o.id, o.title);
    return m;
  }, [objectivesInCycle]);

  const linkedTier2Objectives = useMemo(() => {
    const ids = new Set<string>();
    for (const l of krObjectiveLinks) ids.add(l.objective_id);
    return Array.from(ids)
      .map((id) => ({ id, title: objectiveTitleById.get(id) ?? "OKR" }))
      .sort((a, b) => a.title.localeCompare(b.title));
  }, [krObjectiveLinks, objectiveTitleById]);

  const childrenCostBRL = useMemo(() => {
    if (!objective) return null;
    if (objective.level !== "COMPANY") return null;
    const sum = sumDescendantCosts(objective.id, objectivesInCycle);
    return Number.isFinite(sum) ? sum : null;
  }, [objective, objectivesInCycle]);

  const totalCompanyCostBRL = useMemo(() => {
    if (!objective) return null;
    if (objective.level !== "COMPANY") return null;
    const own = typeof objective.estimated_cost_brl === "number" ? objective.estimated_cost_brl : 0;
    const kids = typeof childrenCostBRL === "number" ? childrenCostBRL : 0;
    const total = own + kids;
    return Number.isFinite(total) ? total : null;
  }, [childrenCostBRL, objective]);

  const overallPct = useMemo(() => {
    const pcts = krs
      .map((k) => krProgressPct(k))
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    if (!pcts.length) return null;
    return Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
  }, [krs]);

  const { data: deliverables = [] } = useQuery({
    queryKey: ["okr-deliverables", objectiveId, krIds.join(",")],
    enabled: krIds.length > 0,
    queryFn: () => listDeliverablesByKeyResultIds(krIds),
  });

  const deliverableIds = useMemo(() => deliverables.map((d) => d.id), [deliverables]);

  const { data: tasks = [] } = useQuery({
    queryKey: ["okr-tasks-for-objective", objectiveId, deliverableIds.join(",")],
    enabled: deliverableIds.length > 0,
    queryFn: () => listTasksByDeliverableIds(deliverableIds),
  });

  const { data: profiles = [] } = useQuery({
    queryKey: ["profiles", cid],
    enabled: hasCompany,
    queryFn: () => listProfilesByCompany(cid),
  });

  const profileById = useMemo(() => {
    const m = new Map<string, { name: string; monthlyCostBRL: number | null }>();
    for (const p of profiles) m.set(p.id, { name: p.name ?? p.email, monthlyCostBRL: p.monthly_cost_brl });
    return m;
  }, [profiles]);

  const byUserId = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of profiles) m.set(p.id, p.name ?? p.email);
    return m;
  }, [profiles]);

  const deliverablesByKrId = useMemo(() => {
    const m = new Map<string, DbDeliverable[]>();
    for (const d of deliverables) {
      const arr = m.get(d.key_result_id) ?? [];
      arr.push(d);
      m.set(d.key_result_id, arr);
    }
    return m;
  }, [deliverables]);

  const tasksByDeliverableId = useMemo(() => {
    const m = new Map<string, DbTask[]>();
    for (const t of tasks) {
      const arr = m.get(t.deliverable_id) ?? [];
      arr.push(t);
      m.set(t.deliverable_id, arr);
    }
    return m;
  }, [tasks]);

  const canWrite =
    !!objective && (user.id === objective.owner_user_id || user.role === "ADMIN" || user.role === "HEAD" || user.role === "MASTERADMIN");

  const canEditTask = (t: DbTask) => canWrite || t.owner_user_id === user.id;

  const [markOpen, setMarkOpen] = useState(false);
  const [markPct, setMarkPct] = useState<string>("");
  const [markSaving, setMarkSaving] = useState(false);

  const [delOpen, setDelOpen] = useState(false);
  const [delKrId, setDelKrId] = useState<string | null>(null);
  const [delTitle, setDelTitle] = useState("");
  const [delDesc, setDelDesc] = useState("");
  const [delOwner, setDelOwner] = useState<string | null>(null);
  const [delDue, setDelDue] = useState<string>("");
  const [delSaving, setDelSaving] = useState(false);

  // Alignment (Tier1 -> link Tier2 objectives to a KR)
  const [linkOpen, setLinkOpen] = useState(false);
  const [linkKrId, setLinkKrId] = useState<string | null>(null);
  const [linkObjectiveId, setLinkObjectiveId] = useState<string>(SELECT_NONE);
  const [linkSaving, setLinkSaving] = useState(false);

  const [deleteObjectiveOpen, setDeleteObjectiveOpen] = useState(false);
  const [deleteKrOpen, setDeleteKrOpen] = useState(false);
  const [deleteKrId, setDeleteKrId] = useState<string | null>(null);

  const resetLink = () => {
    setLinkKrId(null);
    setLinkObjectiveId(SELECT_NONE);
  };

  const resetDeliverable = () => {
    setDelKrId(null);
    setDelTitle("");
    setDelDesc("");
    setDelOwner(null);
    setDelDue("");
  };

  const [taskOpen, setTaskOpen] = useState(false);
  const [taskMode, setTaskMode] = useState<"create" | "edit">("create");
  const [taskEditingId, setTaskEditingId] = useState<string | null>(null);
  const [taskDeliverableId, setTaskDeliverableId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskOwner, setTaskOwner] = useState<string>(user.id);
  const [taskDue, setTaskDue] = useState<string>("");
  const [taskEstimate, setTaskEstimate] = useState<string>("");
  const [taskSaving, setTaskSaving] = useState(false);

  const [taskDeleteOpen, setTaskDeleteOpen] = useState(false);
  const [taskDeleteId, setTaskDeleteId] = useState<string | null>(null);

  const resetTask = () => {
    setTaskMode("create");
    setTaskEditingId(null);
    setTaskDeliverableId(null);
    setTaskTitle("");
    setTaskDesc("");
    setTaskOwner(user.id);
    setTaskDue("");
    setTaskEstimate("");
  };

  // Tasks should NOT require ROI. Keep only a simple optional time estimate.
  const taskBusinessOk = true;

  const toggleTaskDone = async (t: DbTask) => {
    if (!canEditTask(t)) {
      toast({ title: "Sem permissão", description: "Somente o dono da tarefa (ou o dono do objetivo/admin) pode editar." });
      return;
    }

    try {
      const next: WorkStatus = t.status === "DONE" ? "TODO" : "DONE";
      await updateTask(t.id, { status: next });
      await qc.invalidateQueries({ queryKey: ["okr-tasks-for-objective", objectiveId] });
    } catch (e) {
      toast({
        title: "Não foi possível atualizar",
        description: e instanceof Error ? e.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const toggleDeliverableKr = async (kr: DbOkrKeyResult) => {
    if (!canWrite) return;
    if (kr.kind !== "DELIVERABLE") return;
    try {
      const nextAchieved = !kr.achieved;
      await updateKeyResult(kr.id, {
        achieved: nextAchieved,
        achieved_at: nextAchieved ? new Date().toISOString() : null,
      });
      await qc.invalidateQueries({ queryKey: ["okr-krs", objectiveId] });
    } catch (e) {
      toast({
        title: "Não foi possível atualizar",
        description: e instanceof Error ? e.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  if (!hasCompany) {
    return (
      <div className="grid gap-6">
        <OkrPageHeader
          title="Objetivo"
          subtitle="Carregando contexto da empresa…"
          icon={<Target className="h-5 w-5" />}
          actions={
            <Button asChild variant="outline" className="h-11 rounded-xl">
              <Link to="/okr/quarter">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Link>
            </Button>
          }
        />

        <OkrSubnav />

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-sm text-muted-foreground">Aguardando identificação da empresa do seu usuário…</div>
        </Card>
      </div>
    );
  }

  const expected = typeof objective?.expected_attainment_pct === "number" ? objective.expected_attainment_pct : null;
  const showRoi = okrRoiEnabled && !!objective;

  return (
    <div className="grid gap-6">
      <OkrPageHeader
        title="Objetivo"
        subtitle="KRs → entregáveis → tarefas. Uma linha reta até a execução."
        icon={<Target className="h-5 w-5" />}
        help={{
          title: "Como ler essa tela",
          body: (
            <div className="grid gap-2">
              <div>
                <span className="font-semibold text-[color:var(--sinaxys-ink)]">KRs</span> mostram o progresso mensurável.
              </div>
              <div>
                <span className="font-semibold text-[color:var(--sinaxys-ink)]">Entregáveis</span> viram pacotes de entrega (Tier).
              </div>
              <div>
                <span className="font-semibold text-[color:var(--sinaxys-ink)]">Tarefas</span> são o dia a dia (sem ROI aqui).
              </div>
            </div>
          ),
        }}
        actions={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button asChild variant="outline" className="h-11 rounded-xl">
              <Link to="/okr/quarter">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Link>
            </Button>
            {canWrite ? (
              <Button
                variant="outline"
                className="h-11 rounded-xl border-destructive/30 bg-white text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setDeleteObjectiveOpen(true)}
                title="Excluir objetivo"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            ) : null}
            {canWrite && objective?.status !== "ACHIEVED" ? (
              <Button
                className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                onClick={() => {
                  setMarkPct(typeof overallPct === "number" ? String(overallPct) : String(expected ?? 80));
                  setMarkOpen(true);
                }}
              >
                Marcar atingido
              </Button>
            ) : null}
          </div>
        }
      />

      <OkrSubnav />

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        {loadingObjective ? (
          <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Carregando…</div>
        ) : objective ? (
          <div className="grid gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="text-lg font-semibold leading-tight text-[color:var(--sinaxys-ink)]">{objective.title}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge className={"rounded-full " + objectiveTypeBadgeClass(objective.level)}>
                    {objectiveTypeLabel(objective.level)}
                  </Badge>
                  <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)] hover:bg-white">
                    {objectiveLevelLabel(objective.level)}
                  </Badge>
                  {objective.status === "ACHIEVED" ? (
                    <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)] hover:bg-white">
                      Atingido
                    </Badge>
                  ) : null}
                  <span>•</span>
                  <span>Dono: {byUserId.get(objective.owner_user_id) ?? "—"}</span>
                  {objective.linked_fundamental ? (
                    <>
                      <span>•</span>
                      <span>
                        Conectado a <span className="font-medium text-[color:var(--sinaxys-ink)]">{objective.linked_fundamental}</span>
                      </span>
                    </>
                  ) : null}
                </div>

                {typeof overallPct === "number" ? (
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>
                        Evolução{expected !== null ? ` (esperado: ${expected}%)` : ""}
                      </span>
                      <span className="font-medium text-[color:var(--sinaxys-ink)]">{overallPct}%</span>
                    </div>
                    <Progress value={overallPct} className="mt-2 h-2 rounded-full bg-[color:var(--sinaxys-tint)]" />
                  </div>
                ) : null}
              </div>

              {objective.linked_fundamental_text?.trim() ? (
                <div className="max-w-xl rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4 text-sm text-[color:var(--sinaxys-ink)]">
                  "{objective.linked_fundamental_text}"
                </div>
              ) : null}
            </div>

            {objective.description?.trim() ? <p className="text-sm text-muted-foreground">{objective.description}</p> : null}
            {objective.strategic_reason?.trim() ? (
              <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Motivo estratégico</div>
                <div className="mt-2 whitespace-pre-wrap text-sm text-[color:var(--sinaxys-ink)]">{objective.strategic_reason}</div>
              </div>
            ) : null}

            {showRoi ? (
              <OkrObjectiveBusinessCase companyId={cid} objective={objective} canWrite={canWrite} linkedObjectives={linkedTier2Objectives} />
            ) : null}
          </div>
        ) : (
          <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Objetivo não encontrado.</div>
        )}
      </Card>

      <div className="grid gap-6">
        {krs.length ? (
          krs.map((kr) => (
            <KrCard
              key={kr.id}
              kr={kr}
              deliverables={deliverablesByKrId.get(kr.id) ?? []}
              tasksByDeliverableId={tasksByDeliverableId}
              byUserId={byUserId}
              canWrite={canWrite}
              canEditTask={canEditTask}
              isTier1={isTier1}
              linkedObjectives={linkedObjectiveLinksByKrId.get(kr.id) ?? []}
              objectiveTitleById={objectiveTitleById}
              onUnlinkObjective={async (linkId, tier2ObjectiveId) => {
                try {
                  await unlinkObjectiveFromKr(linkId);

                  // Keep the "both objective + KR" invariant when this link was created via this dialog:
                  // only clear parent if it currently points to this Tier 1 objective.
                  const o = await getOkrObjective(tier2ObjectiveId);
                  if (o?.parent_objective_id === objectiveId) {
                    await updateOkrObjective(tier2ObjectiveId, { parent_objective_id: null });
                  }

                  await qc.invalidateQueries({ queryKey: ["okr-kr-objective-links", objectiveId] });
                  toast({ title: "Vínculo removido" });
                } catch (e) {
                  toast({
                    title: "Não foi possível desvincular",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                }
              }}
              onToggleDeliverableKr={() => toggleDeliverableKr(kr)}
              onAddDeliverable={() => {
                resetDeliverable();
                setDelKrId(kr.id);
                setDelOpen(true);
              }}
              onLinkTier2={() => {
                resetLink();
                setLinkKrId(kr.id);
                setLinkObjectiveId(SELECT_NONE);
                setLinkOpen(true);
              }}
              onAddTask={(deliverableId) => {
                resetTask();
                setTaskMode("create");
                setTaskDeliverableId(deliverableId);
                setTaskOpen(true);
              }}
              onEditTask={(t) => {
                resetTask();
                setTaskMode("edit");
                setTaskEditingId(t.id);
                setTaskDeliverableId(t.deliverable_id);
                setTaskTitle(t.title);
                setTaskDesc(t.description ?? "");
                setTaskOwner(t.owner_user_id);
                setTaskDue(t.due_date ?? "");
                setTaskEstimate(typeof t.estimate_minutes === "number" ? String(t.estimate_minutes) : "");
                setTaskOpen(true);
              }}
              onDeleteTask={(t) => {
                setTaskDeleteId(t.id);
                setTaskDeleteOpen(true);
              }}
              onToggleTask={toggleTaskDone}
              onDeleteKr={() => {
                setDeleteKrId(kr.id);
                setDeleteKrOpen(true);
              }}
            />
          ))
        ) : (
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Sem KRs ainda</div>
            <p className="mt-1 text-sm text-muted-foreground">Volte para "Ciclos & OKRs" e adicione KRs mensuráveis.</p>
          </Card>
        )}
      </div>

      <div className="grid gap-6">
        <Dialog
          open={linkOpen}
          onOpenChange={(v) => {
            setLinkOpen(v);
            if (!v) resetLink();
          }}
        >
          <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-xl">
            <DialogHeader>
              <DialogTitle>Vincular OKR (Tier 2) ao KR</DialogTitle>
            </DialogHeader>

            <div className="grid gap-4">
              <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] px-4 py-3 text-sm text-muted-foreground">
                Esse vínculo serve para alinhar os OKRs táticos (Tier 2) aos resultados-chave do OKR estratégico (Tier 1).
              </div>

              <div className="grid gap-2">
                <Label>Objetivo (Tier 1)</Label>
                <Input className="h-11 rounded-xl" value={objective?.title ?? ""} disabled />
              </div>

              <div className="grid gap-2">
                <Label>Resultado-chave (KR Tier 1)</Label>
                <Select value={linkKrId ?? SELECT_NONE} onValueChange={(v) => setLinkKrId(v === SELECT_NONE ? null : v)}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_NONE}>Selecione</SelectItem>
                    {krs
                      .slice()
                      .sort((a, b) => a.title.localeCompare(b.title, "pt-BR"))
                      .map((kr) => (
                        <SelectItem key={kr.id} value={kr.id}>
                          {kr.title}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label>OKR (Tier 2)</Label>
                <Select value={linkObjectiveId} onValueChange={setLinkObjectiveId}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue placeholder="Selecione" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_NONE}>Selecione</SelectItem>
                    {tier2LinkCandidates.map((o) => (
                      <SelectItem key={o.id} value={o.id}>
                        {o.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {tier2LinkCandidates.length === 0 ? (
                  <div className="text-xs text-muted-foreground">Nenhum OKR Tier 2 encontrado neste ciclo. Crie um objetivo tático no ciclo para poder vincular.</div>
                ) : null}
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" className="rounded-xl" onClick={() => setLinkOpen(false)} disabled={linkSaving}>
                Cancelar
              </Button>
              <Button
                className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                disabled={
                  linkSaving ||
                  !canWrite ||
                  !linkKrId ||
                  linkObjectiveId === SELECT_NONE ||
                  !tier2LinkCandidates.some((o) => o.id === linkObjectiveId)
                }
                onClick={async () => {
                  if (!linkKrId) return;
                  if (linkObjectiveId === SELECT_NONE) return;
                  if (!objective) return;
                  setLinkSaving(true);
                  try {
                    // Link is stored on KR, and we also keep the parent objective alignment explicit.
                    await updateOkrObjective(linkObjectiveId, { parent_objective_id: objective.id });
                    await linkObjectiveToKr(linkKrId, linkObjectiveId);

                    await qc.invalidateQueries({ queryKey: ["okr-kr-objective-links", objectiveId] });
                    await qc.invalidateQueries({ queryKey: ["okr-cycle-objectives", cid, objective.cycle_id] });
                    toast({ title: "OKR vinculado ao KR" });
                    setLinkOpen(false);
                  } catch (e) {
                    toast({
                      title: "Não foi possível vincular",
                      description: e instanceof Error ? e.message : "Erro inesperado.",
                      variant: "destructive",
                    });
                  } finally {
                    setLinkSaving(false);
                  }
                }}
              >
                Vincular
                <Link2 className="ml-2 h-4 w-4" />
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Dialog open={markOpen} onOpenChange={setMarkOpen}>
        <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Marcar objetivo como atingido</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">
              Isso registra o atingimento final do objetivo e dispara a pontuação (OKR atingido / no prazo / atingimento esperado cumprido).
            </div>

            <div className="grid gap-2">
              <Label>Atingimento final (%)</Label>
              <Input className="h-11 rounded-xl" value={markPct} onChange={(e) => setMarkPct(e.target.value)} placeholder="85" />
              {expected !== null ? (
                <div className="text-xs text-muted-foreground">Esperado: {expected}%</div>
              ) : (
                <div className="text-xs text-muted-foreground">Defina o esperado no cadastro do objetivo (recomendado).</div>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setMarkOpen(false)} disabled={markSaving}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={markSaving || !objective}
              onClick={async () => {
                if (!objective || markSaving) return;
                const pct = parsePtNumber(markPct);
                if (pct === null || pct < 0 || pct > 100) {
                  toast({ title: "Atingimento inválido", description: "Use um número entre 0 e 100.", variant: "destructive" });
                  return;
                }
                setMarkSaving(true);
                try {
                  await updateOkrObjective(objective.id, {
                    status: "ACHIEVED",
                    achieved_pct: pct,
                    achieved_at: new Date().toISOString(),
                  });
                  await qc.invalidateQueries({ queryKey: ["okr-objective", objectiveId] });
                  toast({ title: "Objetivo marcado como atingido" });
                  setMarkOpen(false);
                } catch (e) {
                  toast({
                    title: "Não foi possível marcar",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                } finally {
                  setMarkSaving(false);
                }
              }}
            >
              Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={delOpen}
        onOpenChange={(v) => {
          setDelOpen(v);
          if (!v) resetDeliverable();
        }}
      >
        <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Novo entregável</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] px-4 py-3 text-sm">
              <span className="font-semibold text-[color:var(--sinaxys-ink)]">Tier automático:</span>{" "}
              <span className="font-semibold text-[color:var(--sinaxys-ink)]">{deliverableTierAuto === "TIER2" ? "Tier 2" : "Tier 1"}</span>
              <span className="text-muted-foreground"> • baseado nos vínculos do objetivo</span>
            </div>

            <div className="grid gap-2">
              <Label>Título</Label>
              <Input className="h-11 rounded-xl" value={delTitle} onChange={(e) => setDelTitle(e.target.value)} placeholder="Ex.: Novo fluxo de onboarding" />
            </div>

            <div className="grid gap-2">
              <Label>Descrição (opcional)</Label>
              <Textarea className="min-h-[92px] rounded-2xl" value={delDesc} onChange={(e) => setDelDesc(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label>Responsável (opcional)</Label>
              <Select
                value={delOwner ?? ""}
                onValueChange={(v) => {
                  setDelOwner(v === SELECT_NONE ? null : v);
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

            <div className="grid gap-2">
              <Label>Prazo (opcional)</Label>
              <Input className="h-11 rounded-xl" type="date" value={delDue} onChange={(e) => setDelDue(e.target.value)} />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setDelOpen(false)} disabled={delSaving}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={!canWrite || !delKrId || delTitle.trim().length < 4 || delSaving}
              onClick={async () => {
                if (!delKrId || !canWrite || delSaving) return;
                setDelSaving(true);
                try {
                  await createDeliverable({
                    key_result_id: delKrId,
                    tier: deliverableTierAuto,
                    title: delTitle,
                    description: delDesc,
                    owner_user_id: delOwner,
                    status: "TODO",
                    due_at: delDue.trim() || null,
                  });
                  await qc.invalidateQueries({ queryKey: ["okr-deliverables", objectiveId] });
                  toast({ title: "Entregável criado" });
                  setDelOpen(false);
                } catch (e) {
                  toast({
                    title: "Não foi possível criar",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                } finally {
                  setDelSaving(false);
                }
              }}
            >
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={taskOpen}
        onOpenChange={(v) => {
          setTaskOpen(v);
          if (!v) resetTask();
        }}
      >
        <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{taskMode === "edit" ? "Editar tarefa" : "Nova tarefa"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Título</Label>
              <Input className="h-11 rounded-xl" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} placeholder="Ex.: Escrever copy da tela inicial" />
            </div>

            <div className="grid gap-2">
              <Label>Descrição (opcional)</Label>
              <Textarea className="min-h-[92px] rounded-2xl" value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} />
            </div>

            <div className="grid gap-2 md:grid-cols-2">
              <div className="grid gap-2">
                <Label>Responsável</Label>
                <Select value={taskOwner} onValueChange={(v) => setTaskOwner(v)} disabled={taskMode === "edit" && !canWrite}>
                  <SelectTrigger className="h-11 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {profiles.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.name ?? p.email}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {taskMode === "edit" && !canWrite ? (
                  <div className="text-xs text-muted-foreground">Somente o dono do objetivo/admin pode reatribuir tarefas.</div>
                ) : null}
              </div>

              <div className="grid gap-2">
                <Label>Vencimento (opcional)</Label>
                <Input className="h-11 rounded-xl" type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Tempo estimado (min)</Label>
              <Input className="h-11 rounded-xl" value={taskEstimate} onChange={(e) => setTaskEstimate(e.target.value)} placeholder="30" />
              <div className="text-xs text-muted-foreground">Estimativa simples para planejamento e priorização.</div>
            </div>

            {/* ROI não é coletado em tarefas. ROI é um atributo do OBJETIVO (quando OKR_ROI está habilitado). */}
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setTaskOpen(false)} disabled={taskSaving}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={
                (!canWrite && taskMode === "create") ||
                !taskDeliverableId ||
                taskTitle.trim().length < 4 ||
                !taskBusinessOk ||
                taskSaving ||
                (taskMode === "edit" && (!taskEditingId || !(canWrite || taskOwner === user.id)))
              }
              onClick={async () => {
                if (!taskDeliverableId || taskSaving) return;

                setTaskSaving(true);
                try {
                  const n = Number(taskEstimate.trim());
                  if (taskMode === "edit" && taskEditingId) {
                    const patch: Parameters<typeof updateTask>[1] = {
                      title: taskTitle,
                      description: taskDesc,
                      due_date: taskDue.trim() || null,
                      estimate_minutes: Number.isFinite(n) ? n : null,
                      checklist: null,
                    };

                    if (canWrite) patch.owner_user_id = taskOwner;

                    await updateTask(taskEditingId, patch);
                    await qc.invalidateQueries({ queryKey: ["okr-tasks-for-objective", objectiveId] });
                    toast({ title: "Tarefa atualizada" });
                    setTaskOpen(false);
                    return;
                  }

                  if (!canWrite) return;

                  await createTask({
                    deliverable_id: taskDeliverableId,
                    title: taskTitle,
                    description: taskDesc,
                    owner_user_id: taskOwner,
                    status: "TODO",
                    due_date: taskDue.trim() || null,
                    estimate_minutes: Number.isFinite(n) ? n : null,
                    checklist: null,
                    estimated_value_brl: null,
                    estimated_cost_brl: null,
                    estimated_roi_pct: null,
                  });
                  await qc.invalidateQueries({ queryKey: ["okr-tasks-for-objective", objectiveId] });
                  toast({ title: "Tarefa criada" });
                  setTaskOpen(false);
                } catch (e) {
                  toast({
                    title: "Não foi possível salvar",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                } finally {
                  setTaskSaving(false);
                }
              }}
            >
              {taskMode === "edit" ? "Salvar" : "Criar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={taskDeleteOpen}
        onOpenChange={(v) => {
          setTaskDeleteOpen(v);
          if (!v) setTaskDeleteId(null);
        }}
      >
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!taskDeleteId) return;
                try {
                  await deleteTask(taskDeleteId);
                  await qc.invalidateQueries({ queryKey: ["okr-tasks-for-objective", objectiveId] });
                  toast({ title: "Tarefa excluída" });
                } catch (e) {
                  toast({
                    title: "Não foi possível excluir",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                } finally {
                  setTaskDeleteOpen(false);
                  setTaskDeleteId(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteKrOpen} onOpenChange={setDeleteKrOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir KR?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso também remove entregáveis, tarefas, histórico de alterações e vínculos com OKRs Tier 2.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteKrId) return;
                try {
                  await deleteKeyResultCascade(deleteKrId);
                  await qc.invalidateQueries({ queryKey: ["okr-krs", objectiveId] });
                  await qc.invalidateQueries({ queryKey: ["okr-deliverables", objectiveId] });
                  await qc.invalidateQueries({ queryKey: ["okr-kr-objective-links", objectiveId] });
                  toast({ title: "KR excluído" });
                } catch (e) {
                  toast({
                    title: "Não foi possível excluir",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                } finally {
                  setDeleteKrOpen(false);
                  setDeleteKrId(null);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={deleteObjectiveOpen} onOpenChange={setDeleteObjectiveOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir objetivo?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso exclui também KRs, entregáveis, tarefas e vínculos. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                try {
                  await deleteOkrObjectiveCascade(objectiveId);
                  await qc.invalidateQueries({ queryKey: ["okr-objective", objectiveId] });
                  await qc.invalidateQueries({ queryKey: ["okr-krs", objectiveId] });
                  await qc.invalidateQueries({ queryKey: ["okr-deliverables", objectiveId] });
                  await qc.invalidateQueries({ queryKey: ["okr-kr-objective-links", objectiveId] });
                  toast({ title: "Objetivo excluído" });
                  window.history.back();
                } catch (e) {
                  toast({
                    title: "Não foi possível excluir",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                } finally {
                  setDeleteObjectiveOpen(false);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function KrCard({
  kr,
  deliverables,
  tasksByDeliverableId,
  byUserId,
  canWrite,
  canEditTask,
  onToggleDeliverableKr,
  onAddDeliverable,
  onLinkTier2,
  isTier1,
  linkedObjectives,
  objectiveTitleById,
  onUnlinkObjective,
  onAddTask,
  onEditTask,
  onDeleteTask,
  onToggleTask,
  onDeleteKr,
}: {
  kr: DbOkrKeyResult;
  deliverables: DbDeliverable[];
  tasksByDeliverableId: Map<string, DbTask[]>;
  byUserId: Map<string, string>;
  canWrite: boolean;
  canEditTask: (t: DbTask) => boolean;
  onToggleDeliverableKr: () => void;
  onAddDeliverable: () => void;
  onLinkTier2: () => void;
  isTier1: boolean;
  linkedObjectives: { id: string; objectiveId: string }[];
  objectiveTitleById: Map<string, string>;
  onUnlinkObjective: (linkId: string, tier2ObjectiveId: string) => void;
  onAddTask: (deliverableId: string) => void;
  onEditTask: (t: DbTask) => void;
  onDeleteTask: (t: DbTask) => void;
  onToggleTask: (t: DbTask) => void;
  onDeleteKr: () => void;
}) {
  const pct = krProgressPct(kr);
  const unit = kr.metric_unit?.trim() ?? "";
  const unitSuffix = unit ? ` ${unit}` : "";

  const [open, setOpen] = useState(true);

  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
              <KeyRound className="mr-1.5 h-3.5 w-3.5" />
              KR
            </Badge>
            {kr.kind === "DELIVERABLE" ? (
              <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)] hover:bg-white">
                Entregável
              </Badge>
            ) : null}
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{kr.title}</div>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {typeof pct === "number" ? (
              <>
                <span className="font-semibold text-[color:var(--sinaxys-ink)]">{pct}%</span>
                <span>•</span>
              </>
            ) : null}
            <span>Confiança: {kr.confidence}</span>
            {kr.owner_user_id ? (
              <>
                <span>•</span>
                <span>Resp.: {byUserId.get(kr.owner_user_id) ?? "—"}</span>
              </>
            ) : null}
            {kr.kind === "DELIVERABLE" && kr.due_at ? (
              <>
                <span>•</span>
                <span>Prazo: {fmtDate(kr.due_at) ?? kr.due_at}</span>
              </>
            ) : null}
            {kr.kind === "METRIC" && kr.metric_unit?.trim() ? (
              <>
                <span>•</span>
                <span>Unidade: {kr.metric_unit}</span>
              </>
            ) : null}
          </div>

          {isTier1 && linkedObjectives.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {linkedObjectives.map((l) => (
                <div
                  key={l.id}
                  className="group inline-flex items-center gap-2 rounded-full border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] px-3 py-1.5 text-xs"
                  title="OKR Tier 2 vinculado"
                >
                  <span className="font-semibold text-[color:var(--sinaxys-ink)]">
                    {objectiveTitleById.get(l.objectiveId) ?? "OKR"}
                  </span>
                  {canWrite ? (
                    <button
                      type="button"
                      className="grid h-6 w-6 place-items-center rounded-full text-muted-foreground transition hover:bg-white hover:text-[color:var(--sinaxys-ink)]"
                      onClick={() => onUnlinkObjective(l.id, l.objectiveId)}
                      title="Desvincular"
                    >
                      <Unlink2 className="h-3.5 w-3.5" />
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
          ) : null}

          {kr.kind === "METRIC" ? (
            <div className="mt-3 flex flex-wrap gap-2">
              <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Inicial</div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                  {fmtMetricValue(kr.start_value)}{unitSuffix}
                </div>
              </div>
              <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Atual</div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                  {fmtMetricValue(kr.current_value)}{unitSuffix}
                </div>
              </div>
              <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Meta</div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                  {fmtMetricValue(kr.target_value)}{unitSuffix}
                </div>
              </div>
            </div>
          ) : null}

          {typeof pct === "number" ? (
            <div className="mt-4">
              <Progress value={pct} className="h-2 rounded-full bg-[color:var(--sinaxys-tint)]" />
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl bg-white"
            onClick={() => setOpen((v) => !v)}
            title={open ? "Recolher" : "Expandir"}
            aria-label={open ? "Recolher" : "Expandir"}
          >
            {open ? <ChevronUp className="mr-2 h-4 w-4" /> : <ChevronDown className="mr-2 h-4 w-4" />}
            {open ? "Recolher" : "Expandir"}
          </Button>

          {canWrite ? (
            <Button
              variant="outline"
              className="h-11 rounded-xl border-destructive/30 bg-white text-destructive hover:bg-destructive/10 hover:text-destructive"
              onClick={onDeleteKr}
              title="Excluir KR"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Excluir
            </Button>
          ) : null}

          {kr.kind === "DELIVERABLE" && canWrite ? (
            <Button
              variant={kr.achieved ? "default" : "outline"}
              className={
                kr.achieved
                  ? "h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                  : "h-11 rounded-xl"
              }
              onClick={onToggleDeliverableKr}
            >
              {kr.achieved ? "Entregue" : "Marcar entregue"}
            </Button>
          ) : null}

          {canWrite ? (
            isTier1 ? (
              <Button variant="outline" className="h-11 rounded-xl" onClick={onLinkTier2} title="Vincular OKR Tier 2 a este KR">
                <Link2 className="mr-2 h-4 w-4" />
                Vincular
              </Button>
            ) : (
              <Button variant="outline" className="h-11 rounded-xl" onClick={onAddDeliverable} title="Criar entregável (Tier I/II)">
                <Plus className="mr-2 h-4 w-4" />
                Entregável
              </Button>
            )
          ) : null}
        </div>
      </div>

      {open ? (
        <>
          <Separator className="my-5" />

          {isTier1 ? (
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entregáveis</div>
              {canWrite ? (
                <Button variant="outline" className="h-10 rounded-xl" onClick={onAddDeliverable} title="Criar entregável">
                  <Plus className="mr-2 h-4 w-4" />
                  Entregável
                </Button>
              ) : null}
            </div>
          ) : null}

          <div className="grid gap-3">
            {deliverables.length ? (
              deliverables.map((d) => (
                <Link
                  key={d.id}
                  to={`/okr/entregaveis/${d.id}`}
                  className="block rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4 transition hover:bg-[color:var(--sinaxys-tint)]/35"
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]">
                          <ListChecks className="h-3.5 w-3.5" />
                          {d.tier}
                        </span>
                        <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{d.title}</div>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        Status: {statusLabel(d.status)}
                        {d.owner_user_id ? ` • Resp.: ${byUserId.get(d.owner_user_id) ?? "—"}` : ""}
                        {d.due_at ? ` • Prazo: ${fmtDate(d.due_at) ?? d.due_at}` : ""}
                      </div>
                      {d.description?.trim() ? <p className="mt-2 text-sm text-muted-foreground">{d.description}</p> : null}
                    </div>

                    {canWrite ? (
                      <Button
                        variant="outline"
                        className="h-11 rounded-xl"
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          onAddTask(d.id);
                        }}
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Tarefa
                      </Button>
                    ) : null}
                  </div>

                  <div className="mt-4 grid gap-2">
                    {(tasksByDeliverableId.get(d.id) ?? []).length ? (
                      (tasksByDeliverableId.get(d.id) ?? []).map((t) => {
                        const editable = canEditTask(t);
                        return (
                          <div
                            key={t.id}
                            role={editable ? "button" : undefined}
                            tabIndex={editable ? 0 : -1}
                            className={
                              "group flex w-full items-start gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-3 text-left transition" +
                              (editable ? " cursor-pointer hover:bg-[color:var(--sinaxys-tint)]/40" : " opacity-80")
                            }
                            onClick={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              if (!editable) return;
                              onToggleTask(t);
                            }}
                            title={
                              t.status === "DONE"
                                ? `Concluída em ${fmtDate(t.completed_at) ?? "—"}`
                                : editable
                                  ? "Clique para alternar concluído"
                                  : "Sem permissão para editar esta tarefa"
                            }
                          >
                            <div className="mt-0.5 text-[color:var(--sinaxys-primary)]">
                              {t.status === "DONE" ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                            </div>
                            <div className="min-w-0 flex-1">
                              <div className="flex flex-wrap items-center justify-between gap-2">
                                <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{t.title}</div>
                                <div className="flex items-center gap-2">
                                  <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">{statusLabel(t.status)}</Badge>
                                  {editable ? (
                                    <div className="flex items-center gap-1">
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-[color:var(--sinaxys-tint)] hover:text-[color:var(--sinaxys-ink)]"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          onEditTask(t);
                                        }}
                                        title="Editar tarefa"
                                      >
                                        <Pencil className="h-4 w-4" />
                                      </Button>
                                      <Button
                                        type="button"
                                        variant="ghost"
                                        size="icon"
                                        className="h-9 w-9 rounded-xl text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
                                        onClick={(e) => {
                                          e.preventDefault();
                                          e.stopPropagation();
                                          onDeleteTask(t);
                                        }}
                                        title="Excluir tarefa"
                                      >
                                        <Trash2 className="h-4 w-4" />
                                      </Button>
                                    </div>
                                  ) : null}
                                </div>
                              </div>
                              <div className="mt-1 text-xs text-muted-foreground">Resp.: {byUserId.get(t.owner_user_id) ?? "—"}</div>
                            </div>
                          </div>
                        );
                      })
                    ) : (
                      <div className="rounded-2xl bg-white p-3 text-sm text-muted-foreground">Sem tarefas ainda.</div>
                    )}
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Sem entregáveis ainda.</div>
            )}
          </div>
        </>
      ) : null}
    </Card>
  );
}