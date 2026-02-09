import { Link } from "react-router-dom";
import { ArrowRight, Award, Sparkles } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth";
import { computeProgress } from "@/lib/sinaxys";
import { getAssignmentsForUser } from "@/lib/journeyDb";

export default function AppDashboard() {
  const { user } = useAuth();
  if (!user) return null;

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ["assignments-for-user", user.id],
    queryFn: () => getAssignmentsForUser(user.id),
  });

  const inProgress = assignments.filter((a) => a.assignment.status !== "COMPLETED");
  const completed = assignments.filter((a) => a.assignment.status === "COMPLETED");

  const next = inProgress
    .slice()
    .sort((a, b) => (b.assignment.started_at ?? b.assignment.assigned_at).localeCompare(a.assignment.started_at ?? a.assignment.assigned_at))[0];

  return (
    <div className="grid gap-6">
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Sua próxima etapa</div>
            <p className="mt-1 text-sm text-muted-foreground">Sequência com clareza: conclua o módulo atual para liberar o próximo.</p>
          </div>

          {next ? (
            <Button
              asChild
              className="h-11 w-full rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90 md:w-auto"
            >
              <Link to={`/app/tracks/${next.assignment.id}`}>
                Continuar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          ) : (
            <Button asChild variant="outline" className="h-11 w-full rounded-xl md:w-auto">
              <Link to="/app/certificates">
                Ver certificados
                <Award className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="mt-5 rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Carregando…</div>
        ) : next ? (
          <div className="mt-5 grid gap-3">
            <div className="flex items-center justify-between text-sm">
              <div className="font-medium text-[color:var(--sinaxys-ink)]">{next.track.title}</div>
              <div className="text-muted-foreground">
                {next.completedModules} de {next.totalModules} concluídos
              </div>
            </div>
            <Progress
              value={computeProgress(next.completedModules, next.totalModules)}
              className="h-2 rounded-full bg-[color:var(--sinaxys-tint)]"
            />
          </div>
        ) : (
          <div className="mt-5 flex items-start gap-3 rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white">
              <Sparkles className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
            </div>
            <div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Tudo em dia</div>
              <p className="mt-1 text-sm text-muted-foreground">Você não tem trilhas em andamento agora.</p>
            </div>
          </div>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Em andamento</div>
          <p className="mt-1 text-sm text-muted-foreground">Acompanhe o que está aberto e avance em sequência.</p>

          <div className="mt-4 grid gap-3">
            {inProgress.length ? (
              inProgress.map((a) => (
                <Link
                  key={a.assignment.id}
                  to={`/app/tracks/${a.assignment.id}`}
                  className="rounded-2xl border border-[color:var(--sinaxys-border)] p-4 transition hover:bg-[color:var(--sinaxys-tint)]/50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-[color:var(--sinaxys-ink)]">{a.track.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">
                        {a.completedModules} de {a.totalModules} módulos concluídos
                      </div>
                    </div>
                    <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{a.progressPct}%</div>
                  </div>
                  <div className="mt-3">
                    <Progress value={a.progressPct} className="h-2 rounded-full bg-[color:var(--sinaxys-tint)]" />
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Nenhuma trilha em andamento.</div>
            )}
          </div>
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Concluídas</div>
          <p className="mt-1 text-sm text-muted-foreground">Histórico de trilhas finalizadas.</p>

          <div className="mt-4 grid gap-3">
            {completed.length ? (
              completed.map((a) => (
                <Link
                  key={a.assignment.id}
                  to={`/app/tracks/${a.assignment.id}`}
                  className="rounded-2xl border border-[color:var(--sinaxys-border)] p-4 transition hover:bg-[color:var(--sinaxys-tint)]/50"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="truncate text-sm font-medium text-[color:var(--sinaxys-ink)]">{a.track.title}</div>
                      <div className="mt-1 text-xs text-muted-foreground">Trilha concluída</div>
                    </div>
                    <div className="rounded-full bg-[color:var(--sinaxys-tint)] px-3 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)]">100%</div>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Você ainda não concluiu nenhuma trilha.</div>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
