import { useMemo } from "react";
import { CheckCircle2, Circle, Clock, Flame, ListChecks } from "lucide-react";
import { format, endOfWeek, startOfWeek } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { useCompany } from "@/lib/company";
import type { DbTask } from "@/lib/okrDb";
import { listTasksForUser, updateTask } from "@/lib/okrDb";
import { OkrPageHeader } from "@/components/OkrPageHeader";

function TaskRow({ task, onToggleDone }: { task: DbTask; onToggleDone: (t: DbTask) => void }) {
  const done = task.status === "DONE";

  return (
    <button
      type="button"
      className="group flex w-full items-start gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4 text-left transition hover:bg-[color:var(--sinaxys-tint)]/40"
      onClick={() => onToggleDone(task)}
    >
      <div className="mt-0.5 text-[color:var(--sinaxys-primary)]">
        {done ? <CheckCircle2 className="h-5 w-5" /> : <Circle className="h-5 w-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)] group-hover:text-[color:var(--sinaxys-ink)]">
            {task.title}
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
          </div>
        </div>
        {task.description?.trim() ? <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{task.description}</p> : null}
      </div>
    </button>
  );
}

export default function OkrToday() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const { companyId } = useCompany();

  if (!user || !companyId) return null;

  const today = new Date();
  const todayIso = format(today, "yyyy-MM-dd");
  const weekFrom = format(startOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");
  const weekTo = format(endOfWeek(today, { weekStartsOn: 1 }), "yyyy-MM-dd");

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ["okr-my-tasks", companyId, user.id, weekFrom, weekTo],
    queryFn: () => listTasksForUser(companyId, user.id, { from: weekFrom, to: weekTo }),
  });

  const groups = useMemo(() => {
    const overdue: DbTask[] = [];
    const todayList: DbTask[] = [];
    const week: DbTask[] = [];
    const done: DbTask[] = [];

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

  const toggleDone = async (t: DbTask) => {
    try {
      const next = t.status === "DONE" ? "TODO" : "DONE";
      await updateTask(t.id, { status: next });
      await qc.invalidateQueries({ queryKey: ["okr-my-tasks", companyId, user.id, weekFrom, weekTo] });
    } catch (e) {
      toast({
        title: "Não foi possível atualizar",
        description: e instanceof Error ? e.message : "Erro inesperado.",
        variant: "destructive",
      });
    }
  };

  const totalOpen = groups.overdue.length + groups.todayList.length + groups.week.length;

  return (
    <div className="grid gap-6">
      <OkrPageHeader
        title="Rotina diária"
        subtitle="Prioridades do dia e da semana — conectadas à estratégia, sem burocracia."
        icon={<ListChecks className="h-5 w-5" />}
        actions={
          <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">
            {isLoading ? "Carregando…" : `${totalOpen} abertas`}
          </Badge>
        }
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
        <div className="grid gap-6">
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Hoje</div>
                <p className="mt-1 text-sm text-muted-foreground">Clique para marcar como feito.</p>
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
                groups.todayList.map((t) => <TaskRow key={t.id} task={t} onToggleDone={toggleDone} />)
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
                groups.week.map((t) => <TaskRow key={t.id} task={t} onToggleDone={toggleDone} />)
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
                groups.overdue.map((t) => <TaskRow key={t.id} task={t} onToggleDone={toggleDone} />)
              ) : (
                <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Sem tarefas atrasadas.</div>
              )}
            </div>
          </Card>

          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Concluídas</div>
            <p className="mt-1 text-sm text-muted-foreground">Registre execução e mantenha o ritmo.</p>

            <Separator className="my-5" />

            <div className="grid gap-3">
              {groups.done.length ? (
                groups.done.map((t) => <TaskRow key={t.id} task={t} onToggleDone={toggleDone} />)
              ) : (
                <div className="rounded-2xl bg-[color:var(--sinaxys-bg)] p-4 text-sm text-muted-foreground">Nada concluído nesta janela.</div>
              )}
            </div>
          </Card>

          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)] p-6">
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Dica rápida</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Se uma tarefa não estiver conectada a um entregável/KR, ela vira ruído. Use o assistente de OKR para criar tudo já
              conectado.
            </p>
            <Button
              asChild
              className="mt-4 h-11 w-full rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
            >
              <Link to="/okr/assistente">Abrir assistente</Link>
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
