import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Circle, Layers, Plus, Target } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { brl, brlPerHourFromMonthly } from "@/lib/costs";
import { laborCostFromMonthly, parsePtNumber, roiPct } from "@/lib/roi";
import { listProfilesByCompany } from "@/lib/profilesDb";
import {
  createDeliverable,
  createTask,
  getOkrObjective,
  krProgressPct,
  listDeliverablesByKeyResultIds,
  listKeyResults,
  listTasksByDeliverableIds,
  updateKeyResult,
  updateOkrObjective,
  updateTask,
  type DbDeliverable,
  type DbOkrKeyResult,
  type DbTask,
  type DeliverableTier,
  type WorkStatus,
} from "@/lib/okrDb";
import { OkrPageHeader } from "@/components/OkrPageHeader";

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

export default function OkrObjectiveDetail() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { objectiveId } = useParams();
  const { user } = useAuth();
  const { companyId } = useCompany();

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

  const overallPct = useMemo(() => {
    const pcts = krs
      .map((k) => krProgressPct(k))
      .filter((v): v is number => typeof v === "number" && Number.isFinite(v));
    if (!pcts.length) return null;
    return Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length);
  }, [krs]);

  const krIds = useMemo(() => krs.map((k) => k.id), [krs]);

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

  const [markOpen, setMarkOpen] = useState(false);
  const [markPct, setMarkPct] = useState<string>("");
  const [markSaving, setMarkSaving] = useState(false);

  const [delOpen, setDelOpen] = useState(false);
  const [delKrId, setDelKrId] = useState<string | null>(null);
  const [delTier, setDelTier] = useState<DeliverableTier>("TIER1");
  const [delTitle, setDelTitle] = useState("");
  const [delDesc, setDelDesc] = useState("");
  const [delOwner, setDelOwner] = useState<string | null>(null);
  const [delDue, setDelDue] = useState<string>("");
  const [delSaving, setDelSaving] = useState(false);

  const resetDeliverable = () => {
    setDelKrId(null);
    setDelTier("TIER1");
    setDelTitle("");
    setDelDesc("");
    setDelOwner(null);
    setDelDue("");
  };

  const [taskOpen, setTaskOpen] = useState(false);
  const [taskDeliverableId, setTaskDeliverableId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskOwner, setTaskOwner] = useState<string>(user.id);
  const [taskDue, setTaskDue] = useState<string>("");
  const [taskEstimate, setTaskEstimate] = useState<string>("");
  const [taskValue, setTaskValue] = useState<string>("");
  const [taskSaving, setTaskSaving] = useState(false);

  const resetTask = () => {
    setTaskDeliverableId(null);
    setTaskTitle("");
    setTaskDesc("");
    setTaskOwner(user.id);
    setTaskDue("");
    setTaskEstimate("");
    setTaskValue("");
  };

  const requiresTaskBusinessCase = !!objective?.department_id;
  const taskOwnerMonthly = profileById.get(taskOwner)?.monthlyCostBRL ?? null;
  const taskMinutes = parsePtNumber(taskEstimate);
  const taskHours = taskMinutes !== null ? taskMinutes / 60 : null;
  const taskValueBRL = parsePtNumber(taskValue);
  const taskCostBRL = laborCostFromMonthly(taskOwnerMonthly, taskHours);
  const taskRoi = roiPct(taskValueBRL, taskCostBRL);

  const taskBusinessOk =
    !requiresTaskBusinessCase ||
    (!!taskValueBRL && taskValueBRL > 0 && !!taskMinutes && taskMinutes > 0 && !!taskOwnerMonthly && taskOwnerMonthly > 0 && taskCostBRL !== null && taskRoi !== null);

  const toggleTaskDone = async (t: DbTask) => {
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
              <Link to="/okr/ciclos">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Link>
            </Button>
          }
        />
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-sm text-muted-foreground">Aguardando identificação da empresa do seu usuário…</div>
        </Card>
      </div>
    );
  }

  const expected = typeof objective?.expected_attainment_pct === "number" ? objective.expected_attainment_pct : null;

  return (
    <div className="grid gap-6">
      <OkrPageHeader
        title="Objetivo"
        subtitle="KRs → entregáveis → tarefas. Uma linha reta até a execução."
        icon={<Target className="h-5 w-5" />}
        actions={
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button asChild variant="outline" className="h-11 rounded-xl">
              <Link to="/okr/ciclos">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Link>
            </Button>
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

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        {loadingObjective ? (
          <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Carregando…</div>
        ) : objective ? (
          <div className="grid gap-4">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div className="min-w-0">
                <div className="text-lg font-semibold leading-tight text-[color:var(--sinaxys-ink)]">{objective.title}</div>
                <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                    {objective.level}
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
              onToggleDeliverableKr={() => toggleDeliverableKr(kr)}
              onAddDeliverable={() => {
                resetDeliverable();
                setDelKrId(kr.id);
                setDelOpen(true);
              }}
              onAddTask={(deliverableId) => {
                resetTask();
                setTaskDeliverableId(deliverableId);
                setTaskOpen(true);
              }}
              onToggleTask={toggleTaskDone}
            />
          ))
        ) : (
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Sem KRs ainda</div>
            <p className="mt-1 text-sm text-muted-foreground">Volte para "Ciclos & OKRs" e adicione KRs mensuráveis.</p>
          </Card>
        )}
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
            <div className="grid gap-2">
              <Label>Tier</Label>
              <Select value={delTier} onValueChange={(v) => setDelTier(v as DeliverableTier)}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="TIER1">Tier I (estratégico)</SelectItem>
                  <SelectItem value="TIER2">Tier II (operacional)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Título</Label>
              <Input className="h-11 rounded-xl" value={delTitle} onChange={(e) => setDelTitle(e.target.value)} placeholder="Ex.: Novo fluxo de onboarding" />
            </div>

            <div className="grid gap-2">
              <Label>Descrição (opcional)</Label>
              <Textarea className="min-h-[92px] rounded-2xl" value={delDesc} onChange={(e) => setDelDesc(e.target.value)} />
            </div>

            <div className="grid gap-2 md:grid-cols-2">
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
                    tier: delTier,
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
            <DialogTitle>Nova tarefa</DialogTitle>
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
                <Select value={taskOwner} onValueChange={(v) => setTaskOwner(v)}>
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
              </div>

              <div className="grid gap-2">
                <Label>Vencimento (opcional)</Label>
                <Input className="h-11 rounded-xl" type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} />
              </div>
            </div>

            <div className="grid gap-2">
              <Label>Tempo estimado (min{requiresTaskBusinessCase ? ", obrigatório" : ", opcional"})</Label>
              <Input className="h-11 rounded-xl" value={taskEstimate} onChange={(e) => setTaskEstimate(e.target.value)} placeholder="30" />
            </div>

            {requiresTaskBusinessCase ? (
              <div className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4">
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Impacto financeiro + ROI</div>
                <p className="mt-1 text-sm text-muted-foreground">Estimativa rápida: impacto (R$) e ROI baseado no custo/h do responsável.</p>

                <div className="mt-4 grid gap-2">
                  <Label>Impacto estimado (R$)</Label>
                  <Input className="h-11 rounded-xl" value={taskValue} onChange={(e) => setTaskValue(e.target.value)} placeholder="5000" />
                </div>

                <div className="mt-3 rounded-2xl bg-white p-3 ring-1 ring-[color:var(--sinaxys-border)]">
                  <div className="text-xs text-muted-foreground">Custo/h do responsável: {brlPerHourFromMonthly(taskOwnerMonthly ?? 0)}</div>
                  {!taskOwnerMonthly ? (
                    <div className="mt-1 text-xs text-[color:var(--sinaxys-ink)]">
                      Para calcular ROI, cadastre o custo mensal da pessoa em <span className="font-semibold">Custos</span>.
                    </div>
                  ) : null}
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Custo estimado:</span>
                    <span className="font-semibold text-[color:var(--sinaxys-ink)]">{taskCostBRL !== null ? brl(taskCostBRL) : "—"}</span>
                    <span className="text-muted-foreground">• ROI:</span>
                    <span className="font-semibold text-[color:var(--sinaxys-ink)]">
                      {taskRoi !== null ? `${taskRoi.toFixed(1)}%` : "—"}
                    </span>
                  </div>
                </div>
              </div>
            ) : null}
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-xl" onClick={() => setTaskOpen(false)} disabled={taskSaving}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={!canWrite || !taskDeliverableId || taskTitle.trim().length < 4 || !taskBusinessOk || taskSaving}
              onClick={async () => {
                if (!taskDeliverableId || !canWrite || taskSaving) return;
                setTaskSaving(true);
                try {
                  const n = Number(taskEstimate.trim());
                  await createTask({
                    deliverable_id: taskDeliverableId,
                    title: taskTitle,
                    description: taskDesc,
                    owner_user_id: taskOwner,
                    status: "TODO",
                    due_date: taskDue.trim() || null,
                    estimate_minutes: Number.isFinite(n) ? n : null,
                    checklist: null,
                    estimated_value_brl: taskValueBRL,
                    estimated_cost_brl: taskCostBRL !== null ? Number(taskCostBRL.toFixed(2)) : null,
                    estimated_roi_pct: taskRoi !== null ? Number(taskRoi.toFixed(2)) : null,
                  });
                  await qc.invalidateQueries({ queryKey: ["okr-tasks-for-objective", objectiveId] });
                  toast({ title: "Tarefa criada" });
                  setTaskOpen(false);
                } catch (e) {
                  toast({
                    title: "Não foi possível criar",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                } finally {
                  setTaskSaving(false);
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

function KrCard({
  kr,
  deliverables,
  tasksByDeliverableId,
  byUserId,
  canWrite,
  onToggleDeliverableKr,
  onAddDeliverable,
  onAddTask,
  onToggleTask,
}: {
  kr: DbOkrKeyResult;
  deliverables: DbDeliverable[];
  tasksByDeliverableId: Map<string, DbTask[]>;
  byUserId: Map<string, string>;
  canWrite: boolean;
  onToggleDeliverableKr: () => void;
  onAddDeliverable: () => void;
  onAddTask: (deliverableId: string) => void;
  onToggleTask: (t: DbTask) => void;
}) {
  const pct = krProgressPct(kr);

  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
      <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
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

          {typeof pct === "number" ? (
            <div className="mt-4">
              <Progress value={pct} className="h-2 rounded-full bg-[color:var(--sinaxys-tint)]" />
            </div>
          ) : null}
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
            <Button variant="outline" className="h-11 rounded-xl" onClick={onAddDeliverable} title="Criar entregável (Tier I/II)">
              <Plus className="mr-2 h-4 w-4" />
              Entregável
            </Button>
          ) : null}
        </div>
      </div>

      <Separator className="my-5" />

      <div className="grid gap-3">
        {deliverables.length ? (
          deliverables.map((d) => (
            <div key={d.id} className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-[11px] font-semibold text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]">
                      <Layers className="h-3.5 w-3.5" />
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
                  <Button variant="outline" className="h-11 rounded-xl" onClick={() => onAddTask(d.id)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Tarefa
                  </Button>
                ) : null}
              </div>

              <div className="mt-4 grid gap-2">
                {(tasksByDeliverableId.get(d.id) ?? []).length ? (
                  (tasksByDeliverableId.get(d.id) ?? []).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      className="flex w-full items-start gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-3 text-left transition hover:bg-[color:var(--sinaxys-tint)]/40"
                      onClick={() => onToggleTask(t)}
                      title={t.status === "DONE" ? `Concluída em ${fmtDate(t.completed_at) ?? "—"}` : "Clique para alternar concluído"}
                    >
                      <div className="mt-0.5 text-[color:var(--sinaxys-primary)]">
                        {t.status === "DONE" ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{t.title}</div>
                          <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">{statusLabel(t.status)}</Badge>
                        </div>
                        <div className="mt-1 text-xs text-muted-foreground">Resp.: {byUserId.get(t.owner_user_id) ?? "—"}</div>
                      </div>
                    </button>
                  ))
                ) : (
                  <div className="rounded-2xl bg-white p-3 text-sm text-muted-foreground">Sem tarefas ainda.</div>
                )}
              </div>
            </div>
          ))
        ) : (
          <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Sem entregáveis ainda.</div>
        )}
      </div>
    </Card>
  );
}