import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, CheckCircle2, Circle, ListChecks, Pencil, Plus, Trash2 } from "lucide-react";

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

        <div className="grid gap-2">
          {tasksSorted.length ? (
            tasksSorted.map((t) => {
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
                        {t.due_date ? <span className="text-xs text-muted-foreground">{fmtDate(t.due_date)}</span> : null}
                        {editable ? (
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-[color:var(--sinaxys-tint)] hover:text-[color:var(--sinaxys-ink)]"
                              onClick={(e) => {
                                e.stopPropagation();
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
                              onClick={(e) => {
                                e.stopPropagation();
                                setTaskDeleteId(t.id);
                                setTaskDeleteOpen(true);
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
            <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Sem tarefas ainda.</div>
          )}
        </div>
      </Card>

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
