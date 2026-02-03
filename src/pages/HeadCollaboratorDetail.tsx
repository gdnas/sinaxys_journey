import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCircle2,
  Lock,
  PlayCircle,
  ClipboardCheck,
  HelpCircle,
  Target,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { mockDb } from "@/lib/mockDb";
import type { ModuleProgress, TrackModule } from "@/lib/domain";
import { computeProgress } from "@/lib/sinaxys";

function statusBadge(p?: ModuleProgress) {
  const s = p?.status ?? "LOCKED";
  if (s === "COMPLETED") {
    return (
      <Badge className="rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-100">
        Concluído
      </Badge>
    );
  }
  if (s === "AVAILABLE") {
    return (
      <Badge className="rounded-full bg-blue-100 text-blue-800 hover:bg-blue-100">Disponível</Badge>
    );
  }
  return <Badge className="rounded-full bg-muted text-muted-foreground hover:bg-muted">Bloqueado</Badge>;
}

function moduleIcon(type: TrackModule["type"], p?: ModuleProgress) {
  if (p?.status === "COMPLETED") return <CheckCircle2 className="h-4 w-4" />;
  if (p?.status === "LOCKED") return <Lock className="h-4 w-4" />;

  switch (type) {
    case "VIDEO":
      return <PlayCircle className="h-4 w-4" />;
    case "QUIZ":
      return <HelpCircle className="h-4 w-4" />;
    case "CHECKPOINT":
      return <ClipboardCheck className="h-4 w-4" />;
  }
}

export default function HeadCollaboratorDetail() {
  const { user } = useAuth();
  const { userId } = useParams();
  const [, force] = useState(0);

  const collaborator = useMemo(() => {
    if (!userId) return null;
    return mockDb.getUsers().find((u) => u.id === userId) ?? null;
  }, [userId]);

  const deptName = useMemo(() => {
    const depts = mockDb.getDepartments();
    const dept = collaborator?.departmentId ? depts.find((d) => d.id === collaborator.departmentId) : undefined;
    return dept?.name ?? "—";
  }, [collaborator]);

  const assignments = useMemo(() => {
    if (!collaborator) return [];
    return mockDb.getAssignmentsForUser(collaborator.id);
  }, [collaborator, force]);

  if (!user || user.role !== "HEAD") return null;

  // access control (MVP): head only sees collaborators in their department
  if (!collaborator || collaborator.role !== "COLABORADOR" || collaborator.departmentId !== user.departmentId) {
    return (
      <div className="grid gap-4">
        <div className="rounded-3xl border bg-white p-6">
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Acesso restrito</div>
          <p className="mt-1 text-sm text-muted-foreground">
            Você só pode visualizar colaboradores do seu departamento.
          </p>
          <Button asChild variant="outline" className="mt-4 rounded-xl">
            <Link to="/head">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-col justify-between gap-3 rounded-3xl border bg-white p-6 md:flex-row md:items-center">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Colaborador</div>
          <div className="mt-1 truncate text-xl font-semibold text-[color:var(--sinaxys-ink)]">{collaborator.name}</div>
          <div className="mt-1 text-sm text-muted-foreground">
            {collaborator.email} • {deptName}
          </div>
        </div>
        <Button asChild variant="outline" className="rounded-xl">
          <Link to="/head">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Trilhas atribuídas</div>
            <p className="mt-1 text-sm text-muted-foreground">Detalhe por módulo, com status e evidências do quiz/checkpoint.</p>
          </div>
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
            <Target className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
          </div>
        </div>

        <div className="mt-5">
          {assignments.length ? (
            <Accordion type="single" collapsible className="w-full">
              {assignments.map((a) => {
                const detail = mockDb.getAssignmentDetail(a.assignment.id);
                const total = a.totalModules;
                const done = a.completedModules;
                const pct = computeProgress(done, total);

                return (
                  <AccordionItem key={a.assignment.id} value={a.assignment.id} className="border-b-0">
                    <div className="rounded-2xl border border-[color:var(--sinaxys-border)]">
                      <AccordionTrigger className="px-4 py-3 hover:no-underline">
                        <div className="flex w-full flex-col gap-2 text-left md:flex-row md:items-center md:justify-between">
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                              {a.track.title}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {done} de {total} módulos • {pct}%
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {a.assignment.status === "COMPLETED" ? (
                              <Badge className="rounded-full bg-emerald-100 text-emerald-800 hover:bg-emerald-100">Concluída</Badge>
                            ) : a.assignment.status === "IN_PROGRESS" ? (
                              <Badge className="rounded-full bg-blue-100 text-blue-800 hover:bg-blue-100">Em andamento</Badge>
                            ) : (
                              <Badge className="rounded-full bg-amber-100 text-amber-800 hover:bg-amber-100">Não iniciada</Badge>
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>

                      <AccordionContent className="px-4 pb-4">
                        <div className="grid gap-4">
                          <div className="grid gap-2">
                            <Progress value={pct} className="h-2 rounded-full bg-[color:var(--sinaxys-tint)]" />
                            <div className="text-xs text-muted-foreground">Progresso geral</div>
                          </div>

                          <Separator />

                          {!detail ? (
                            <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
                              Não foi possível carregar o detalhe desta trilha.
                            </div>
                          ) : (
                            <div className="grid gap-2">
                              {detail.modules.map((m) => {
                                const p = detail.progressByModuleId[m.id];

                                return (
                                  <div
                                    key={m.id}
                                    className="rounded-2xl border border-[color:var(--sinaxys-border)] p-4"
                                  >
                                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                                      <div className="min-w-0">
                                        <div className="flex items-start gap-3">
                                          <div
                                            className={
                                              "mt-0.5 grid h-9 w-9 place-items-center rounded-xl " +
                                              (p?.status === "COMPLETED"
                                                ? "bg-[color:var(--sinaxys-primary)] text-white"
                                                : p?.status === "AVAILABLE"
                                                  ? "bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]"
                                                  : "bg-muted text-muted-foreground")
                                            }
                                          >
                                            {moduleIcon(m.type, p)}
                                          </div>

                                          <div className="min-w-0">
                                            <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                                              {m.orderIndex}. {m.title}
                                            </div>
                                            <div className="mt-1 flex flex-wrap items-center gap-2">
                                              {statusBadge(p)}
                                              <span className="text-xs text-muted-foreground">+{m.xpReward} XP</span>
                                            </div>
                                            {m.description ? (
                                              <div className="mt-2 text-sm text-muted-foreground">{m.description}</div>
                                            ) : null}
                                          </div>
                                        </div>
                                      </div>

                                      <div className="md:text-right">
                                        {m.type === "QUIZ" ? (
                                          <div className="text-xs text-muted-foreground">
                                            Tentativas: <span className="font-medium text-[color:var(--sinaxys-ink)]">{p?.attemptsCount ?? 0}</span>
                                            {typeof p?.score === "number" ? (
                                              <>
                                                <br />
                                                Nota: <span className="font-medium text-[color:var(--sinaxys-ink)]">{p.score}%</span>
                                              </>
                                            ) : null}
                                          </div>
                                        ) : m.type === "CHECKPOINT" ? (
                                          p?.checkpointAnswerText ? (
                                            <Dialog>
                                              <DialogTrigger asChild>
                                                <Button variant="outline" className="mt-1 rounded-xl">
                                                  Ver resposta
                                                </Button>
                                              </DialogTrigger>
                                              <DialogContent className="rounded-3xl">
                                                <DialogHeader>
                                                  <DialogTitle>Resposta do checkpoint</DialogTitle>
                                                </DialogHeader>
                                                <div className="text-sm text-muted-foreground">
                                                  <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                                    {m.title}
                                                  </div>
                                                  <div className="mt-3 whitespace-pre-wrap rounded-2xl border bg-white p-4 text-sm text-[color:var(--sinaxys-ink)]">
                                                    {p.checkpointAnswerText}
                                                  </div>
                                                </div>
                                              </DialogContent>
                                            </Dialog>
                                          ) : (
                                            <div className="text-xs text-muted-foreground">Sem resposta registrada.</div>
                                          )
                                        ) : null}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </AccordionContent>
                    </div>
                  </AccordionItem>
                );
              })}
            </Accordion>
          ) : (
            <div className="mt-4 rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
              Nenhuma trilha atribuída ainda.
            </div>
          )}
        </div>

        <div className="mt-5 flex items-start gap-3 rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
          <div className="text-sm text-muted-foreground">
            Observação: no MVP, checkpoints são auto-conclusivos. Na evolução, você poderá exigir aprovação para liberar o próximo módulo.
          </div>
        </div>
      </Card>
    </div>
  );
}
