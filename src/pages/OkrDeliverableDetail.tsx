import { TaskHierarchyView } from "@/components/okr";
import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Circle,
  ListChecks,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
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

import { OkrPageHeader } from "@/components/OkrPageHeader";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { listProfilesByCompany } from "@/lib/profilesDb";
import {
  deleteDeliverable,
  deleteTask,
  listTasksByDeliverableIds,
  type DbDeliverable,
  type DbTask,
  updateTask,
} from "@/lib/okrDb";
import { supabase } from "@/integrations/supabase/client";

type ExecStep = {
  id: string;
  title: string;
  done: boolean;
  children?: ExecStep[];
};

const EXECUTION_DEPTH_LIMIT = 3;

function makeId() {
  return typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : Math.random().toString(36).slice(2);
}

function normalizeExec(raw: any): ExecStep[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .map((it) => {
      if (!it || typeof it !== "object") return null;
      const id = typeof (it as any).id === "string" ? (it as any).id : makeId();
      const title = typeof (it as any).title === "string" ? (it as any).title : "";
      const done = !!(it as any).done;
      const children = normalizeExec((it as any).children);
      return {
        id,
        title: title.trim(),
        done,
        children: children.length ? children : undefined,
      } satisfies ExecStep;
    })
    .filter((x) => !!x && (!!x.title || ((x as any).children?.length ?? 0) > 0)) as ExecStep[];

}

function execCount(nodes: ExecStep[]) {
  let n = 0;
  for (const it of nodes) {
    n += 1;
    if (it.children?.length) n += execCount(it.children);
  }
  return n;
}

function updateExec(nodes: ExecStep[], id: string, updater: (x: ExecStep) => ExecStep): ExecStep[] {
  return nodes
    .map((n) => {
      if (n.id === id) return updater(n);
      if (n.children?.length) return { ...n, children: updateExec(n.children, id, updater) };
      return n;
    })
    .filter(Boolean);
}

function removeExec(nodes: ExecStep[], id: string): ExecStep[] {
  return nodes
    .filter((n) => n.id !== id)
    .map((n) => (n.children?.length ? { ...n, children: removeExec(n.children, id) } : n));
}

function addExec(nodes: ExecStep[], parentId: string | null, child: ExecStep): ExecStep[] {
  if (!parentId) return [...nodes, child];
  return nodes.map((n) => {
    if (n.id !== parentId) return n.children?.length ? { ...n, children: addExec(n.children, parentId, child) } : n;
    const nextChildren = [...(n.children ?? []), child];
    return { ...n, children: nextChildren };
  });
}

function statusLabel(s: DbTask["status"]) {
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

async function getDeliverable(deliverableId: string) {
  const { data, error } = await supabase
    .from("okr_deliverables")
    .select("id,key_result_id,tier,title,description,owner_user_id,status,due_at,created_at,updated_at")
    .eq("id", deliverableId)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as DbDeliverable | null;
}

async function getKeyResultObjectiveId(keyResultId: string) {
  const { data, error } = await supabase.from("okr_key_results").select("objective_id").eq("id", keyResultId).maybeSingle();
  if (error) throw error;
  return (data?.objective_id ?? null) as string | null;
}

export default function OkrDeliverableDetail() {
  const { deliverableId } = useParams();
  const { user } = useAuth();
  const { companyId } = useCompany();
  const { toast } = useToast();
  const qc = useQueryClient();

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [taskOpen, setTaskOpen] = useState(false);
  const [taskMode, setTaskMode] = useState<"create" | "edit">("create");
  const [taskSaving, setTaskSaving] = useState(false);
  const [taskDeleteOpen, setTaskDeleteOpen] = useState(false);
  const [taskDeleteId, setTaskDeleteId] = useState<string | null>(null);

  const [taskEditingId, setTaskEditingId] = useState<string | null>(null);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDesc, setTaskDesc] = useState("");
  const [taskOwner, setTaskOwner] = useState<string | null>(null);
  const [taskDue, setTaskDue] = useState<string>("");

  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);

  const [stepOpen, setStepOpen] = useState(false);
  const [stepMode, setStepMode] = useState<"add" | "edit">("add");
  const [stepTaskId, setStepTaskId] = useState<string | null>(null);
  const [stepParentId, setStepParentId] = useState<string | null>(null);
  const [stepEditId, setStepEditId] = useState<string | null>(null);
  const [stepDepth, setStepDepth] = useState<number>(1);
  const [stepTitle, setStepTitle] = useState("");
  const [stepSaving, setStepSaving] = useState(false);

  if (!deliverableId || !user) return null;

  const cid = companyId ?? "";
  const hasCompany = !!companyId;

  const qDeliverable = useQuery({
    queryKey: ["okr-deliverable", deliverableId],
    queryFn: () => getDeliverable(deliverableId),
  });

  const qObjectiveId = useQuery({
    queryKey: ["okr-deliverable-objective", deliverableId, qDeliverable.data?.key_result_id ?? ""],
    enabled: !!qDeliverable.data?.key_result_id,
    queryFn: () => getKeyResultObjectiveId(qDeliverable.data!.key_result_id),
    staleTime: 30_000,
  });

  const qProfiles = useQuery({
    queryKey: ["profiles", cid],
    enabled: hasCompany,
    queryFn: () => listProfilesByCompany(cid),
    staleTime: 60_000,
  });

  const people = useMemo(() => {
    const p = qProfiles.data ?? [];
    return p
      .map((x) => ({ id: x.id, name: x.name ?? x.email }))
      .sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [qProfiles.data]);

  const byUserId = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of qProfiles.data ?? []) m.set(p.id, p.name ?? p.email);
    return m;
  }, [qProfiles.data]);

  const deliverable = qDeliverable.data;

  const canWrite = useMemo(() => {
    if (!deliverable) return false;
    if (user.role === "MASTERADMIN" || user.role === "ADMIN" || user.role === "HEAD") return true;
    return deliverable.owner_user_id ? deliverable.owner_user_id === user.id : false;
  }, [deliverable, user.id, user.role]);

  const { data: tasks = [] } = useQuery({
    queryKey: ["okr-tasks-for-deliverable", deliverableId],
    enabled: !!deliverableId,
    queryFn: () => listTasksByDeliverableIds([deliverableId]),
  });

  const tasksSorted = useMemo(() => {
    return tasks.slice().sort((a, b) => {
      const aDone = a.status === "DONE";
      const bDone = b.status === "DONE";
      if (aDone !== bDone) return aDone ? 1 : -1;
      return (a.due_date ?? "9999-12-31").localeCompare(b.due_date ?? "9999-12-31");
    });
  }, [tasks]);

  const resetTask = () => {
    setTaskMode("create");
    setTaskEditingId(null);
    setTaskTitle("");
    setTaskDesc("");
    setTaskOwner(user.id);
    setTaskDue("");
  };

  const canEditTask = (t: DbTask) => canWrite || t.owner_user_id === user.id;

  const openAddStep = (taskId: string, parentId: string | null, depth: number) => {
    setStepMode("add");
    setStepTaskId(taskId);
    setStepParentId(parentId);
    setStepEditId(null);
    setStepDepth(depth);
    setStepTitle("");
    setStepOpen(true);
  };

  const openEditStep = (taskId: string, node: ExecStep, depth: number) => {
    setStepMode("edit");
    setStepTaskId(taskId);
    setStepParentId(null);
    setStepEditId(node.id);
    setStepDepth(depth);
    setStepTitle(node.title);
    setStepOpen(true);
  };

  const saveStep = async () => {
    if (!stepTaskId) return;
    const title = stepTitle.trim();
    if (title.length < 3) {
      toast({ title: "Título muito curto", description: "Use pelo menos 3 caracteres.", variant: "destructive" });
      return;
    }

    const t = tasks.find((x) => x.id === stepTaskId);
    if (!t) return;
    if (!canEditTask(t)) return;

    const current = normalizeExec(t.checklist);
    const next =
      stepMode === "add"
        ? addExec(current, stepParentId, { id: makeId(), title, done: false, children: undefined })
        : stepEditId
          ? updateExec(current, stepEditId, (x) => ({ ...x, title }))
          : current;

    try {
      setStepSaving(true);
      await updateTask(stepTaskId, { checklist: next });
      await qc.invalidateQueries({ queryKey: ["okr-tasks-for-deliverable", deliverableId] });
      setStepOpen(false);
    } catch (e) {
      toast({
        title: "Não foi possível salvar",
        description: e instanceof Error ? e.message : "Erro inesperado.",
        variant: "destructive",
      });
    } finally {
      setStepSaving(false);
    }
  };

  const toggleStep = async (taskId: string, nodeId: string) => {
    const t = tasks.find((x) => x.id === taskId);
    if (!t) return;
    if (!canEditTask(t)) return;

    const current = normalizeExec(t.checklist);
    const next = updateExec(current, nodeId, (x) => ({ ...x, done: !x.done }));
    try {
      await updateTask(taskId, { checklist: next });
      await qc.invalidateQueries({ queryKey: ["okr-tasks-for-deliverable", deliverableId] });
    } catch (e) {
      toast({
        title: "Não foi possível atualizar",
        description: e instanceof Error ? e.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const deleteStep = async (taskId: string, nodeId: string) => {
    const t = tasks.find((x) => x.id === taskId);
    if (!t) return;
    if (!canEditTask(t)) return;

    const current = normalizeExec(t.checklist);
    const next = removeExec(current, nodeId);
    try {
      await updateTask(taskId, { checklist: next });
      await qc.invalidateQueries({ queryKey: ["okr-tasks-for-deliverable", deliverableId] });
    } catch (e) {
      toast({
        title: "Não foi possível excluir",
        description: e instanceof Error ? e.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const StepTree = ({ taskId, nodes, depth }: { taskId: string; nodes: ExecStep[]; depth: number }) => {
    const canAddChild = depth < EXECUTION_DEPTH_LIMIT;
    return (
      <div className="grid gap-2">
        {nodes.map((n) => (
          <div key={n.id} className="grid gap-2">
            <div className={"flex items-start gap-2 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-3 " + (depth > 1 ? "ml-" + String((depth - 1) * 4) : "")}
              style={depth > 1 ? { marginLeft: (depth - 1) * 14 } : undefined}
            >
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl text-[color:var(--sinaxys-primary)] hover:bg-[color:var(--sinaxys-tint)]"
                onClick={(e) => {
                  e.stopPropagation();
                  void toggleStep(taskId, n.id);
                }}
                disabled={!canEditTask(tasks.find((x) => x.id === taskId) as DbTask)}
                title={n.done ? "Marcar como não concluído" : "Marcar como concluído"}
              >
                {n.done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
              </Button>

              <div className="min-w-0 flex-1">
                <div className={"text-sm font-semibold " + (n.done ? "text-muted-foreground line-through" : "text-[color:var(--sinaxys-ink)]")}>{n.title}</div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{depth === 1 ? "Passo" : depth === 2 ? "Subpasso" : "Micro-passos"}</span>
                  {n.children?.length ? <span>• {execCount(n.children)} itens abaixo</span> : null}
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-[color:var(--sinaxys-tint)] hover:text-[color:var(--sinaxys-ink)]"
                  onClick={(e) => {
                    e.stopPropagation();
                    openEditStep(taskId, n, depth);
                  }}
                  title="Editar"
                  disabled={!canEditTask(tasks.find((x) => x.id === taskId) as DbTask)}
                >
                  <Pencil className="h-4 w-4" />
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 rounded-xl text-destructive/80 hover:bg-destructive/10 hover:text-destructive"
                  onClick={(e) => {
                    e.stopPropagation();
                    void deleteStep(taskId, n.id);
                  }}
                  title="Excluir"
                  disabled={!canEditTask(tasks.find((x) => x.id === taskId) as DbTask)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>

                {canAddChild ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="ml-1 h-9 rounded-xl bg-white"
                    onClick={(e) => {
                      e.stopPropagation();
                      openAddStep(taskId, n.id, depth + 1);
                    }}
                    disabled={!canEditTask(tasks.find((x) => x.id === taskId) as DbTask)}
                  >
                    <Plus className="mr-1 h-4 w-4" />
                    {depth === 1 ? "Subpasso" : "Micro"}
                  </Button>
                ) : null}
              </div>
            </div>

            {n.children?.length ? <StepTree taskId={taskId} nodes={n.children} depth={depth + 1} /> : null}
          </div>
        ))}
      </div>
    );
  };

  if (!hasCompany) {
    return (
      <div className="grid gap-6">
        <OkrPageHeader
          title="Entregável"
          subtitle="Carregando contexto da empresa…"
          icon={<ListChecks className="h-5 w-5" />}
          actions={
            <Button asChild variant="outline" className="h-11 rounded-xl">
              <Link to="/okr/quarter">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Link>
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <OkrPageHeader
        title={deliverable?.title ?? "Entregável"}
        subtitle={deliverable ? `Tier: ${deliverable.tier} • Status: ${deliverable.status}${deliverable.due_at ? ` • Prazo: ${fmtDate(deliverable.due_at)}` : ""}` : "Carregando…"}
        icon={<ListChecks className="h-5 w-5" />}
        actions={
          <>
            {qObjectiveId.data ? (
              <Button asChild variant="outline" className="h-11 rounded-xl bg-white">
                <Link to={`/okr/objetivos/${qObjectiveId.data}`}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Link>
              </Button>
            ) : (
              <Button asChild variant="outline" className="h-11 rounded-xl bg-white">
                <Link to="/okr/quarter">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Voltar
                </Link>
              </Button>
            )}
            {canWrite ? (
              <Button
                variant="outline"
                className="h-11 rounded-xl border-destructive/30 bg-white text-destructive hover:bg-destructive/10 hover:text-destructive"
                onClick={() => setDeleteOpen(true)}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Excluir
              </Button>
            ) : null}
          </>
        }
      />

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">Entregável</Badge>
              {deliverable?.owner_user_id ? (
                <span className="text-xs text-muted-foreground">Resp.: {byUserId.get(deliverable.owner_user_id) ?? "—"}</span>
              ) : (
                <span className="text-xs text-muted-foreground">Sem responsável</span>
              )}
            </div>
            {deliverable?.description?.trim() ? <p className="mt-2 text-sm text-muted-foreground">{deliverable.description}</p> : null}
          </div>

          {canWrite ? (
            <Button
              className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              onClick={() => {
                resetTask();
                setTaskOpen(true);
              }}
            >
              <Plus className="mr-2 h-4 w-4" />
              Nova tarefa
            </Button>
          ) : null}
        </div>

        <Separator className="my-5" />

        <div className="grid gap-3">
          {tasksSorted.length ? (
            tasksSorted.map((t) => {
              const editable = canEditTask(t);
              const exec = normalizeExec(t.checklist);
              const nExec = execCount(exec);
              const open = expandedTaskId === t.id;

              return (
                <div key={t.id} className="rounded-3xl border border-[color:var(--sinaxys-border)] bg-white p-3">
                  <div className="flex w-full items-start gap-3">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="mt-0.5 h-9 w-9 rounded-xl text-[color:var(--sinaxys-primary)] hover:bg-[color:var(--sinaxys-tint)]"
                      disabled={!editable}
                      onClick={() => {
                        if (!editable) return;
                        void (async () => {
                          try {
                            const next = t.status === "DONE" ? "TODO" : "DONE";
                            await updateTask(t.id, { status: next });
                            await qc.invalidateQueries({ queryKey: ["okr-tasks-for-deliverable", deliverableId] });
                          } catch (e) {
                            toast({
                              title: "Não foi possível atualizar",
                              description: e instanceof Error ? e.message : "Erro inesperado.",
                              variant: "destructive",
                            });
                          }
                        })();
                      }}
                      title={
                        t.status === "DONE"
                          ? `Concluída em ${fmtDate(t.completed_at) ?? "—"}`
                          : editable
                            ? "Marcar como concluído"
                            : "Sem permissão para editar esta tarefa"
                      }
                    >
                      {t.status === "DONE" ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
                    </Button>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{t.title}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span>Resp.: {byUserId.get(t.owner_user_id) ?? "—"}</span>
                            <span>•</span>
                            <span>{statusLabel(t.status)}</span>
                            {t.due_date ? (
                              <>
                                <span>•</span>
                                <span>{fmtDate(t.due_date)}</span>
                              </>
                            ) : null}
                          </div>
                        </div>

                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 rounded-xl bg-white"
                            onClick={() => setExpandedTaskId((cur) => (cur === t.id ? null : t.id))}
                          >
                            {open ? <ChevronDown className="mr-2 h-4 w-4" /> : <ChevronRight className="mr-2 h-4 w-4" />}
                            Desdobramentos
                            <Badge className="ml-2 rounded-full bg-[color:var(--sinaxys-bg)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-bg)]">
                              {nExec}
                            </Badge>
                          </Button>

                          {editable ? (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-[color:var(--sinaxys-tint)] hover:text-[color:var(--sinaxys-ink)]"
                                onClick={() => {
                                  setTaskMode("edit");
                                  setTaskEditingId(t.id);
                                  setTaskTitle(t.title);
                                  setTaskDesc(t.description ?? "");
                                  setTaskOwner(t.owner_user_id);
                                  setTaskDue(t.due_date ?? "");
                                  setTaskOpen(true);
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
                                onClick={() => {
                                  setTaskDeleteId(t.id);
                                  setTaskDeleteOpen(true);
                                }}
                                title="Excluir tarefa"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : null}
                        </div>
                      </div>

                      {open ? (
                        <div className="mt-4 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div>
                              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Desdobramentos (até 3 níveis)</div>
                              <div className="mt-1 text-xs text-muted-foreground">
                                Um jeito limpo de quebrar a tarefa em passos, subpassos e micro-passos.
                              </div>
                            </div>

                            {editable ? (
                              <Button
                                type="button"
                                variant="outline"
                                className="h-10 rounded-xl bg-white"
                                onClick={() => openAddStep(t.id, null, 1)}
                              >
                                <Plus className="mr-2 h-4 w-4" />
                                Adicionar passo
                              </Button>
                            ) : null}
                          </div>

                          <Separator className="my-4" />

                          {exec.length ? (
                            <StepTree taskId={t.id} nodes={exec} depth={1} />
                          ) : (
                            <div className="rounded-2xl bg-white p-4 text-sm text-muted-foreground">
                              Ainda sem desdobramentos. Comece adicionando o primeiro passo.
                            </div>
                          )}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Sem tarefas ainda.</div>
          )}
        </div>
      </Card>

      <Dialog
        open={stepOpen}
        onOpenChange={(v) => {
          if (!stepSaving) setStepOpen(v);
        }}
      >
        <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{stepMode === "add" ? "Novo desdobramento" : "Editar desdobramento"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-2">
            <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-3 text-sm text-muted-foreground">
              {stepDepth === 1
                ? "Passo: a ação principal dentro da tarefa."
                : stepDepth === 2
                  ? "Subpasso: uma parte do passo."
                  : "Micro-passo: detalhe de execução (último nível)."}
            </div>

            <Label>Título</Label>
            <Input className="h-11 rounded-2xl" value={stepTitle} onChange={(e) => setStepTitle(e.target.value)} disabled={stepSaving} />
          </div>

          <DialogFooter>
            <Button
              className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={stepSaving || stepTitle.trim().length < 3}
              onClick={() => void saveStep()}
            >
              Salvar
              <Check className="ml-2 h-4 w-4" />
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={taskOpen}
        onOpenChange={(v) => {
          if (!taskSaving) setTaskOpen(v);
        }}
      >
        <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{taskMode === "create" ? "Nova tarefa" : "Editar tarefa"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Título</Label>
              <Input className="h-11 rounded-2xl" value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} disabled={taskSaving} />
            </div>

            <div className="grid gap-2">
              <Label>Descrição (opcional)</Label>
              <Textarea className="min-h-[100px] rounded-2xl" value={taskDesc} onChange={(e) => setTaskDesc(e.target.value)} disabled={taskSaving} />
            </div>

            <div className="grid gap-2">
              <Label>Responsável</Label>
              <Select value={taskOwner ?? user.id} onValueChange={(v) => setTaskOwner(v)} disabled={taskSaving}>
                <SelectTrigger className="h-11 rounded-2xl bg-white">
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent className="rounded-2xl">
                  {people.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Prazo (opcional)</Label>
              <Input className="h-11 rounded-2xl" type="date" value={taskDue} onChange={(e) => setTaskDue(e.target.value)} disabled={taskSaving} />
            </div>
          </div>

          <DialogFooter>
            <Button
              className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={taskSaving || taskTitle.trim().length < 4}
              onClick={async () => {
                if (!taskOwner) return;
                setTaskSaving(true);
                try {
                  if (taskMode === "create") {
                    const { error } = await supabase.from("okr_tasks").insert({
                      deliverable_id: deliverableId,
                      title: taskTitle.trim(),
                      description: taskDesc.trim() ? taskDesc.trim() : null,
                      owner_user_id: taskOwner,
                      status: "TODO",
                      due_date: taskDue.trim() || null,
                      estimate_minutes: null,
                      checklist: null,
                    });
                    if (error) throw error;
                    toast({ title: "Tarefa criada" });
                  } else {
                    if (!taskEditingId) return;
                    await updateTask(taskEditingId, {
                      title: taskTitle.trim(),
                      description: taskDesc.trim() ? taskDesc.trim() : null,
                      owner_user_id: taskOwner,
                      due_date: taskDue.trim() || null,
                    });
                    toast({ title: "Tarefa atualizada" });
                  }

                  await qc.invalidateQueries({ queryKey: ["okr-tasks-for-deliverable", deliverableId] });
                  setTaskOpen(false);
                  resetTask();
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
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent className="rounded-3xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir entregável?</AlertDialogTitle>
            <AlertDialogDescription>
              Isso remove também as tarefas vinculadas a este entregável. Essa ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="h-11 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                try {
                  // bottom-up
                  await Promise.all(tasks.map((t) => deleteTask(t.id)));
                  await deleteDeliverable(deliverableId);
                  toast({ title: "Entregável excluído" });

                  if (qObjectiveId.data) {
                    // invalidate objective queries so cards refresh
                    await qc.invalidateQueries({ queryKey: ["okr-deliverables", qObjectiveId.data] });
                    await qc.invalidateQueries({ queryKey: ["okr-tasks-for-objective", qObjectiveId.data] });
                  }

                  if (qObjectiveId.data) {
                    window.location.assign(`/okr/objetivos/${qObjectiveId.data}`);
                  } else {
                    window.location.assign("/okr/quarter");
                  }
                } catch (e) {
                  toast({
                    title: "Não foi possível excluir",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
            <AlertDialogCancel className="h-11 rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="h-11 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!taskDeleteId) return;
                try {
                  await deleteTask(taskDeleteId);
                  toast({ title: "Tarefa excluída" });
                  await qc.invalidateQueries({ queryKey: ["okr-tasks-for-deliverable", deliverableId] });
                } catch (e) {
                  toast({
                    title: "Não foi possível excluir",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                } finally {
                  setTaskDeleteId(null);
                  setTaskDeleteOpen(false);
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