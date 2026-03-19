import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, Circle, Clock, Flame, KeyRound, ListChecks, Pencil, Target, Trash2, ExternalLink } from "lucide-react";
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
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import { listWorkItemsForUserWithContext, updateWorkItem, deleteWorkItem, type WorkItemWithOkrContext } from "@/lib/okrDb";
import { OkrPageHeader } from "@/components/OkrPageHeader";
import { OkrSubnav } from "@/components/OkrSubnav";
import WorkItemStatusBadge from "@/components/work/WorkItemStatusBadge";
import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// Helper seguro para parsing de datas
// ============================================================================
function safeFormatDate(dateValue: string | null | undefined, formatStr: string, fallback = ""): string {
  if (!dateValue) return fallback;
  
  try {
    const date = new Date(dateValue);
    // Verifica se a data é válida
    if (isNaN(date.getTime())) return fallback;
    
    return format(date, formatStr as any, { locale: ptBR });
  } catch (error) {
    console.warn("[OkrToday] Invalid date value:", dateValue, error);
    return fallback;
  }
}

// Helper seguro para extrair parte de data para comparação (YYYY-MM-DD)
function safeToISODate(dateValue: string | null | undefined): string | null {
  if (!dateValue) return null;
  
  try {
    const date = new Date(dateValue);
    // Verifica se a data é válida
    if (isNaN(date.getTime())) return null;
    
    return format(date, "yyyy-MM-dd");
  } catch (error) {
    console.warn("[OkrToday] Invalid date value for comparison:", dateValue, error);
    return null;
  }
}

function TaskRow({
  task,
  onToggleDone,
  onEdit,
  onDelete,
}: {
  task: WorkItemWithOkrContext;
  onToggleDone: (t: WorkItemWithOkrContext) => void;
  onEdit: (t: WorkItemWithOkrContext) => void;
  onDelete: (t: WorkItemWithOkrContext) => void;
}) {
  const isDone = task.status === "done";

  return (
    <div
      role="button"
      tabIndex={0}
      className="group flex w-full items-start gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4 text-left transition hover:bg-[color:var(--sinaxys-tint)]/40"
      onClick={() => onToggleDone(task)}
      title={task.objective_title ? `Objetivo: ${task.objective_title}` : undefined}
    >
      <div className="mt-0.5 text-[color:var(--sinaxys-primary)]">
        {isDone ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)] group-hover:text-[color:var(--sinaxys-ink)]">
                {task.title}
              </div>
              <WorkItemStatusBadge status={task.status} />
            </div>

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
              {task.cycle_label ? (
                <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
                  {task.cycle_label}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="flex items-center gap-2">
            {task.due_date ? (
              <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                {safeFormatDate(task.due_date, "dd/MM")}
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
    queryKey: ["work-items-with-okr-context", cid, user.id, weekFrom, weekTo],
    enabled: hasCompany,
    queryFn: () => listWorkItemsForUserWithContext(user.id, { from: weekFrom, to: weekTo }),
  });

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [editingTaskProjectId, setEditingTaskProjectId] = useState<string | null>(null);
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);

  const openEdit = (t: WorkItemWithOkrContext) => {
    if (!t.project_id) {
      toast({
        title: "Não é possível editar",
        description: "Esta tarefa não está vinculada a um projeto.",
        variant: "destructive",
      });
      return;
    }
    setEditingTaskProjectId(t.project_id);
    setEditingTaskId(t.id);
  };

  const groups = useMemo(() => {
    const overdue: WorkItemWithOkrContext[] = [];
    const todayList: WorkItemWithOkrContext[] = [];
    const week: WorkItemWithOkrContext[] = [];
    const done: WorkItemWithOkrContext[] = [];

    for (const t of tasks) {
      if (t.status === "done") {
        done.push(t);
        continue;
      }

      const due = safeToISODate(t.due_date);
      if (due && due < todayIso) overdue.push(t);
      else if (due === todayIso) todayList.push(t);
      else week.push(t);
    }

    return { overdue, todayList, week, done };
  }, [tasks, todayIso]);

  const toggleDone = async (t: WorkItemWithOkrContext) => {
    try {
      const next = t.status === "done" ? "todo" : "done";
      await updateWorkItem(t.id, { status: next });
      await qc.invalidateQueries({ queryKey: ["work-items-with-okr-context", cid, user.id, weekFrom, weekTo] });
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

      {/* Delete Confirmation Dialog */}
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
                  await deleteWorkItem(deleteId);
                  await qc.invalidateQueries({ queryKey: ["work-items-with-okr-context", cid, user.id, weekFrom, weekTo] });
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

      {/* Redirect to canonical edit page */}
      {editingTaskProjectId && editingTaskId && (
        <Link
          to={`/app/projetos/${editingTaskProjectId}/tarefas/${editingTaskId}/editar`}
          className="hidden"
          ref={(el) => {
            if (el) el.click();
            setEditingTaskProjectId(null);
            setEditingTaskId(null);
          }}
        />
      )}
    </div>
  );
}