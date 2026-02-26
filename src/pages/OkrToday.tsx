import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, Clock, Flame, KeyRound, ListChecks, Pencil, Target, Trash2 } from "lucide-react";
import { format, endOfWeek, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import type { DbTaskWithContextV2 } from "@/lib/okrDb";
import { deleteTask, listTasksForUserWithContextV2, updateTask } from "@/lib/okrDb";
import { OkrPageHeader } from "@/components/OkrPageHeader";
import { OkrSubnav } from "@/components/OkrSubnav";
import { objectiveLevelLabel, objectiveTypeBadgeClass, objectiveTypeLabel } from "@/lib/okrUi";

function TaskRow({
  task,
  onToggleDone,
  onEdit,
  onDelete,
}: {
  task: DbTaskWithContextV2;
  onToggleDone: (t: DbTaskWithContextV2) => void;
  onEdit: (t: DbTaskWithContextV2) => void;
  onDelete: (t: DbTaskWithContextV2) => void;
}) {
  const done = task.status === "DONE";

  return (
    <div
      role="button"
      tabIndex={0}
      className="group flex w-full items-start gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4 text-left transition hover:bg-[color:var(--sinaxys-tint)]/40"
      onClick={() => onToggleDone(task)}
      title={task.objective_title ? `Objetivo: ${task.objective_title}` : undefined}
    >
      <div className="mt-0.5 text-[color:var(--sinaxys-primary)]">
        {done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0">
            <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)] group-hover:text-[color:var(--sinaxys-ink)]">{task.title}</div>

            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              {task.deliverable_id ? (
                <span className="inline-flex items-center gap-1">
                  <ListChecks className="h-3.5 w-3.5 text-[color:var(--sinaxys-primary)]" />
                  <Link
                    to={`/okr/entregaveis/${task.deliverable_id}`}
                    className="max-w-[280px] truncate font-medium text-[color:var(--sinaxys-ink)] hover:underline"
                    onClick={(e) => e.stopPropagation()}
                    title={task.deliverable_title}
                  >
                    {task.deliverable_title}
                  </Link>
                </span>
              ) : null}

              {task.key_result_id ? (
                <span className="inline-flex items-center gap-1">
                  <KeyRound className="h-3.5 w-3.5 text-[color:var(--sinaxys-primary)]" />
                  <span className="max-w-[320px] truncate">{task.key_result_title}</span>
                </span>
              ) : null}

              {task.objective_title ? (
                <span className="inline-flex items-center gap-1">
                  <Target className="h-3.5 w-3.5 text-[color:var(--sinaxys-primary)]" />
                  <Link
                    to={`/okr/objetivos/${task.objective_id}`}
                    className="max-w-[320px] truncate font-medium text-[color:var(--sinaxys-ink)] hover:underline"
                    onClick={(e) => e.stopPropagation()}
                    title={task.objective_title}
                  >
                    {task.objective_title}
                  </Link>
                </span>
              ) : null}

              {task.cycle_type ? (
                <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
                  {task.cycle_type === "QUARTERLY" ? `Q${task.cycle_quarter ?? "?"}/${task.cycle_year}` : `${task.cycle_year}`}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {task.due_date ? (
              <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                {format(new Date(task.due_date + "T00:00:00"), "dd/MM", { locale: ptBR })}
              </Badge>
            ) : null}
            {typeof task.estimate_minutes === "number" ? (
              <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
                <Clock className="mr-1 h-3.5 w-3.5" />
                {task.estimate_minutes}min
              </Badge>
            ) : null}

            <div className="ml-1 flex items-center gap-1">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-9 w-9 rounded-xl text-muted-foreground hover:bg-white hover:text-[color:var(--sinaxys-ink)]"
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(task);
                }}
                title="Editar"
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
                  onDelete(task);
                }}
                title="Excluir"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
        {task.description?.trim() ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{task.description}</p> : null}
      </div>
    </div>
  );
}

export default function OkrToday() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { companyId } = useCompany();

  if (!user) return null;

  const cid = companyId ?? "";
  const hasCompany = !!companyId;

  const today = new Date();
  const todayIso = format(today, "yyyy-MM-dd");
  const weekFrom = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekTo = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["okr-my-tasks-v2", cid, user.id, weekFrom, weekTo],
    enabled: hasCompany,
    queryFn: () => listTasksForUserWithContextV2(user.id, { from: weekFrom, to: weekTo }),
  });

  const [editOpen, setEditOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<DbTaskWithContextV2 | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editDue, setEditDue] = useState("");
  const [editEstimate, setEditEstimate] = useState("");
  const [editSaving, setEditSaving] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);

  const openEdit = (t: DbTaskWithContextV2) => {
    setEditingTask(t);
    setEditTitle(t.title);
    setEditDesc(t.description ?? "");
    setEditDue(t.due_date ?? "");
    setEditEstimate(typeof t.estimate_minutes === "number" ? String(t.estimate_minutes) : "");
    setEditOpen(true);
  };

  const groups = useMemo(() => {
    const overdue: DbTaskWithContextV2[] = [];
    const todayList: DbTaskWithContextV2[] = [];
    const week: DbTaskWithContextV2[] = [];
    const done: DbTaskWithContextV2[] = [];

    for (const t of tasks) {
      if (t.status === "DONE") {
        done.push(t);
        continue;
      }

      const due = t.due_date;
      if (due && due < todayIso) overdue.push(t);
      else if (due === todayIso) todayList.push(t);
      else week.push(t);
    }

    return { overdue, todayList, week, done };
  }, [tasks, todayIso]);

  const toggleDone = async (t: DbTaskWithContextV2) => {
    try {
      const next = t.status === "DONE" ? "TODO" : "DONE";
      await updateTask(t.id, { status: next });
      await qc.invalidateQueries({ queryKey: ["okr-my-tasks-v2", cid, user.id, weekFrom, weekTo] });
    } catch (e) {
      toast({
        title: "Não foi possível atualizar",
        description: e instanceof Error ? e.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const totalOpen = groups.overdue.length + groups.todayList.length + groups.week.length;

  if (!hasCompany) {
    return (
      <div className="grid gap-6">
        <OkrPageHeader title="Rotina diária" subtitle="Carregando contexto da empresa…" icon={<ListChecks className="h-5 w-5" />} />
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-sm text-muted-foreground">Aguardando identificação da empresa do seu usuário…</div>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <OkrPageHeader
        title="Rotina diária"
        subtitle="Prioridades do dia e da semana — com contexto do objetivo, sem caça ao tesouro."
        icon={<ListChecks className="h-5 w-5" />}
        help={{
          title: "O que é isso?",
          body: (
            <div className="grid gap-2">
              <div>
                Aqui aparecem suas <span className="font-semibold text-[color:var(--sinaxys-ink)]">tarefas</span> ligadas a OKRs.
              </div>
              <div className="text-muted-foreground">
                Se você não entende por que uma tarefa existe, clique em <span className="font-semibold">Ver objetivo</span>.
              </div>
            </div>
          ),
        }}
        actions={
          <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
            {isLoading ? "Carregando…" : `${totalOpen} abertas`}
          </Badge>
        }
      />

      <OkrSubnav />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-6">
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Hoje</div>
                <p className="mt-1 text-sm text-muted-foreground">Clique para marcar como feito. Se precisar de contexto, abra o objetivo.</p>
              </div>
              <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                {groups.todayList.length}
              </Badge>
            </div>

            <Separator className="my-5" />

            <div className="grid gap-3">
              {isLoading ? (
                <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Carregando…</div>
              ) : groups.todayList.length ? (
                groups.todayList.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onToggleDone={toggleDone}
                    onEdit={openEdit}
                    onDelete={(task) => {
                      setDeleteId(task.id);
                      setDeleteOpen(true);
                    }}
                  />
                ))
              ) : (
                <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">
                  Nenhuma tarefa com vencimento hoje.
                </div>
              )}
            </div>
          </Card>

          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Semana</div>
                <p className="mt-1 text-sm text-muted-foreground">A fila real do que precisa andar.</p>
              </div>
              <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">{groups.week.length}</Badge>
            </div>

            <Separator className="my-5" />

            <div className="grid gap-3">
              {isLoading ? (
                <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Carregando…</div>
              ) : groups.week.length ? (
                groups.week.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onToggleDone={toggleDone}
                    onEdit={openEdit}
                    onDelete={(task) => {
                      setDeleteId(task.id);
                      setDeleteOpen(true);
                    }}
                  />
                ))
              ) : (
                <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Sem tarefas para esta semana.</div>
              )}
            </div>
          </Card>
        </div>

        <div className="grid gap-6">
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Atrasadas</div>
                <p className="mt-1 text-sm text-muted-foreground">Pontos de risco (resolva primeiro).</p>
              </div>
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                <Flame className="h-5 w-5" />
              </div>
            </div>

            <Separator className="my-5" />

            <div className="grid gap-3">
              {groups.overdue.length ? (
                groups.overdue.map((t) => (
                  <TaskRow
                    key={t.id}
                    task={t}
                    onToggleDone={toggleDone}
                    onEdit={openEdit}
                    onDelete={(task) => {
                      setDeleteId(task.id);
                      setDeleteOpen(true);
                    }}
                  />
                ))
              ) : (
                <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Sem tarefas atrasadas.</div>
              )}
            </div>
          </Card>

          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Concluídas</div>
            <p className="mt-1 text-sm text-muted-foreground">Feitas nesta semana.</p>

            <Separator className="my-5" />

            <div className="grid gap-3">
              {groups.done.length ? (
                groups.done.slice(0, 10).map((t) => (
                  <TaskRow key={t.id} task={t} onToggleDone={toggleDone} onEdit={openEdit} onDelete={() => {}} />
                ))
              ) : (
                <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Ainda nada concluído.</div>
              )}
            </div>
          </Card>
        </div>
      </div>

      <Dialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) setEditingTask(null);
        }}
      >
        <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar tarefa</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            {editingTask?.objective_title ? (
              <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-4 text-sm">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Contexto</div>
                <div className="mt-1 font-semibold text-[color:var(--sinaxys-ink)]">{editingTask.objective_title}</div>
              </div>
            ) : null}

            <div className="grid gap-2">
              <Label>Título</Label>
              <Input className="h-11 rounded-xl" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Descrição</Label>
              <Textarea className="min-h-[88px] rounded-2xl" value={editDesc} onChange={(e) => setEditDesc(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Prazo (YYYY-MM-DD)</Label>
              <Input className="h-11 rounded-xl" value={editDue} onChange={(e) => setEditDue(e.target.value)} placeholder="2026-02-14" />
            </div>
            <div className="grid gap-2">
              <Label>Estimativa (min)</Label>
              <Input className="h-11 rounded-xl" value={editEstimate} onChange={(e) => setEditEstimate(e.target.value)} placeholder="30" />
            </div>
          </div>

          <DialogFooter className="mt-2 gap-2 sm:gap-0">
            <Button variant="outline" className="h-11 rounded-xl" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={!editingTask || editSaving}
              onClick={async () => {
                if (!editingTask) return;
                try {
                  setEditSaving(true);
                  await updateTask(editingTask.id, {
                    title: editTitle,
                    description: editDesc,
                    due_date: editDue || null,
                    estimate_minutes: editEstimate ? Number(editEstimate) : null,
                  });
                  await qc.invalidateQueries({ queryKey: ["okr-my-tasks-v2", cid, user.id, weekFrom, weekTo] });
                  setEditOpen(false);
                } catch (e) {
                  toast({
                    title: "Não foi possível salvar",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                } finally {
                  setEditSaving(false);
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
            <AlertDialogTitle>Excluir tarefa?</AlertDialogTitle>
            <AlertDialogDescription>Essa ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="h-11 rounded-xl">Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="h-11 rounded-xl bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                if (!deleteId) return;
                try {
                  await deleteTask(deleteId);
                  await qc.invalidateQueries({ queryKey: ["okr-my-tasks-v2", cid, user.id, weekFrom, weekTo] });
                } catch (e) {
                  toast({
                    title: "Não foi possível excluir",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                } finally {
                  setDeleteId(null);
                  setDeleteOpen(false);
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