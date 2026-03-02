import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, CheckCircle2, Lock, Trophy } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ModuleChecklist } from "@/components/ModuleChecklist";
import { ResourceEmbed } from "@/components/ResourceEmbed";
import { useToast } from "@/hooks/use-toast";
import type { ModuleProgress, QuizOption, QuizQuestion, TrackModule } from "@/lib/domain";
import {
  completeModule,
  getAssignmentDetail,
  getQuizForModule,
  submitQuizAttempt,
  type DbModule,
  type DbModuleProgress,
} from "@/lib/journeyDb";
import { computeProgress, getYouTubeEmbedUrl } from "@/lib/sinaxys";

function mapDbModule(m: DbModule): TrackModule {
  return {
    id: m.id,
    trackId: m.track_id,
    orderIndex: m.order_index,
    type: m.type,
    title: m.title,
    description: m.description ?? undefined,
    xpReward: m.xp_reward,
    youtubeUrl: m.youtube_url ?? undefined,
    materialUrl: m.material_url ?? undefined,
    checkpointPrompt: m.checkpoint_prompt ?? undefined,
    minScore: m.min_score ?? undefined,
  };
}

function mapDbProgress(p: DbModuleProgress): ModuleProgress {
  return {
    id: p.id,
    assignmentId: p.assignment_id,
    moduleId: p.module_id,
    status: p.status,
    attemptsCount: p.attempts_count,
    score: p.score ?? undefined,
    passed: p.passed ?? undefined,
    checkpointAnswerText: p.checkpoint_answer_text ?? undefined,
    completedAt: p.completed_at ?? undefined,
  };
}

export default function TrackPlayer() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const params = useParams();

  // Backwards-compat: older routes used /track/:trackId but the value is actually an assignment id.
  const assignmentId = (params.assignmentId ?? (params as any).trackId ?? "") as string;

  const { data: detail, isLoading } = useQuery({
    queryKey: ["assignment-detail", assignmentId],
    queryFn: () => getAssignmentDetail(assignmentId),
  });

  const mapped = useMemo(() => {
    if (!detail) return null;
    const modules = detail.modules.map(mapDbModule).sort((a, b) => a.orderIndex - b.orderIndex);
    const progressByModuleId: Record<string, ModuleProgress> = Object.fromEntries(
      Object.entries(detail.progressByModuleId).map(([k, v]) => [k, mapDbProgress(v)]),
    );
    return { ...detail, modules, progressByModuleId };
  }, [detail]);

  const [currentModuleId, setCurrentModuleId] = useState<string>("");

  useEffect(() => {
    if (!mapped) return;

    const stillExists = mapped.modules.some((m) => m.id === currentModuleId);
    if (stillExists && currentModuleId) return;

    const available = mapped.modules.find((m) => mapped.progressByModuleId[m.id]?.status === "AVAILABLE");
    setCurrentModuleId(available?.id ?? mapped.modules[0]?.id ?? "");
  }, [mapped?.assignment.id]);

  const module = mapped?.modules.find((m) => m.id === currentModuleId);
  const mp = module ? mapped?.progressByModuleId[module.id] : undefined;

  const stats = useMemo(() => {
    if (!mapped) return { done: 0, total: 0, pct: 0, xp: 0 };
    const progress = Object.values(mapped.progressByModuleId);
    const done = progress.filter((p) => p.status === "COMPLETED").length;
    const total = progress.length;
    const pct = computeProgress(done, total);
    const xp = mapped.modules
      .filter((m) => mapped.progressByModuleId[m.id]?.status === "COMPLETED")
      .reduce((acc, m) => acc + m.xpReward, 0);
    return { done, total, pct, xp };
  }, [mapped]);

  const { data: quiz } = useQuery({
    queryKey: ["quiz", module?.id],
    queryFn: async () => {
      if (!module || module.type !== "QUIZ") return null;
      return getQuizForModule(module.id);
    },
    enabled: !!module && module.type === "QUIZ",
  });

  const [checkpointAnswer, setCheckpointAnswer] = useState("");
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<null | { score: number; passed: boolean; minScore: number }>(null);

  useEffect(() => {
    setCheckpointAnswer("");
    setQuizAnswers({});
    setQuizResult(null);
  }, [module?.id]);

  const completeMutation = useMutation({
    mutationFn: async (payload: { checkpointAnswer?: string }) => {
      if (!mapped || !module) return;
      await completeModule({
        assignmentId: mapped.assignment.id,
        moduleId: module.id,
        checkpointAnswer: payload.checkpointAnswer,
        earnedXp: module.xpReward,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["assignment-detail", assignmentId] });
    },
  });

  const quizMutation = useMutation({
    mutationFn: async (payload: { score: number; passed: boolean }) => {
      if (!mapped || !module) return;
      await submitQuizAttempt({
        assignmentId: mapped.assignment.id,
        moduleId: module.id,
        score: payload.score,
        passed: payload.passed,
        earnedXp: payload.passed ? module.xpReward : 0,
      });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["assignment-detail", assignmentId] });
    },
  });

  if (isLoading) {
    return (
      <div className="rounded-3xl border bg-white p-6">
        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Carregando trilha…</div>
      </div>
    );
  }

  if (!mapped || !module || !mp) {
    return (
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Trilha não encontrada</div>
            <p className="mt-1 text-sm text-muted-foreground">Verifique o link ou retorne ao seu painel.</p>
          </div>
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/app">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Voltar
            </Link>
          </Button>
        </div>
      </div>
    );
  }

  const locked = mp.status === "LOCKED";
  const completed = mp.status === "COMPLETED";
  const available = mp.status === "AVAILABLE";

  const goNextIfAny = () => {
    const nextAvail = mapped.modules.find((m) => mapped.progressByModuleId[m.id]?.status === "AVAILABLE");
    if (nextAvail) setCurrentModuleId(nextAvail.id);
  };

  const computeQuizScore = (questions: QuizQuestion[], optionsByQuestionId: Record<string, QuizOption[]>) => {
    let correct = 0;
    for (const q of questions) {
      const picked = quizAnswers[q.id];
      const opts = optionsByQuestionId[q.id] ?? [];
      const chosen = opts.find((o) => o.id === picked);
      if (chosen?.isCorrect) correct += 1;
    }
    const score = questions.length ? Math.round((correct / questions.length) * 100) : 0;
    const minScore = module.minScore ?? 70;
    const passed = score >= minScore;
    return { score, passed, minScore };
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="grid gap-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/app">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Minha jornada
            </Link>
          </Button>
          <Button asChild variant="outline" className="rounded-xl">
            <Link to="/app/certificates">Certificados</Link>
          </Button>
        </div>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trilha</div>
              <h2 className="mt-1 text-xl font-semibold text-[color:var(--sinaxys-ink)]">{mapped.track.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{mapped.track.description}</p>
            </div>
            <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] px-4 py-3">
              <div className="text-xs text-muted-foreground">Progresso</div>
              <div className="mt-0.5 text-lg font-semibold text-[color:var(--sinaxys-ink)]">{stats.pct}%</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {stats.done} de {stats.total} módulos
              </div>
            </div>
          </div>

          <div className="mt-4">
            <Progress value={stats.pct} className="h-2 rounded-full bg-[color:var(--sinaxys-tint)]" />
          </div>
        </Card>

        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Módulo {module.orderIndex}</div>
              <h3 className="mt-1 text-lg font-semibold text-[color:var(--sinaxys-ink)]">{module.title}</h3>
              {module.description ? <p className="mt-2 text-sm text-muted-foreground">{module.description}</p> : null}
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Recompensa</div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">+{module.xpReward} Pontos</div>
            </div>
          </div>

          {locked ? (
            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white">
                <Lock className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Módulo bloqueado</div>
                <p className="mt-1 text-sm text-muted-foreground">Conclua o módulo anterior para liberar este conteúdo.</p>
              </div>
            </div>
          ) : null}

          {module.type === "VIDEO" ? (
            <div className="mt-6 grid gap-4">
              <div className="overflow-hidden rounded-2xl border">
                <iframe
                  title={module.title}
                  src={getYouTubeEmbedUrl(module.youtubeUrl ?? "")}
                  className="aspect-video w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>

              <div className="flex flex-col items-stretch justify-between gap-3 md:flex-row md:items-center">
                <div className="text-sm text-muted-foreground">Ao concluir, o próximo módulo é liberado automaticamente.</div>
                <Button
                  disabled={!available || completeMutation.isPending}
                  className="h-11 w-full rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90 disabled:opacity-60 md:w-auto"
                  onClick={async () => {
                    await completeMutation.mutateAsync({});
                    toast({ title: "Módulo concluído", description: "Boa. O próximo conteúdo já foi liberado." });
                    goNextIfAny();
                  }}
                >
                  {completed ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Concluído
                    </>
                  ) : (
                    "Concluir"
                  )}
                </Button>
              </div>
            </div>
          ) : null}

          {module.type === "MATERIAL" ? (
            <div className="mt-6 grid gap-4">
              <ResourceEmbed url={module.materialUrl ?? ""} title={module.title} />

              <div className="flex flex-col items-stretch justify-between gap-3 md:flex-row md:items-center">
                <div className="text-sm text-muted-foreground">Ao concluir, o próximo módulo é liberado automaticamente.</div>
                <Button
                  disabled={!available || completeMutation.isPending}
                  className="h-11 w-full rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90 disabled:opacity-60 md:w-auto"
                  onClick={async () => {
                    await completeMutation.mutateAsync({});
                    toast({ title: "Material concluído", description: "Conteúdo registrado. O próximo módulo já está disponível." });
                    goNextIfAny();
                  }}
                >
                  {completed ? (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" /> Concluído
                    </>
                  ) : (
                    "Concluir"
                  )}
                </Button>
              </div>
            </div>
          ) : null}

          {module.type === "CHECKPOINT" ? (
            <div className="mt-6 grid gap-4">
              <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] p-4">
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Pergunta</div>
                <p className="mt-1 text-sm text-muted-foreground">{module.checkpointPrompt}</p>
              </div>

              <div className="grid gap-2">
                <Label>Sua resposta</Label>
                <Textarea
                  value={checkpointAnswer}
                  onChange={(e) => setCheckpointAnswer(e.target.value)}
                  placeholder="Escreva com clareza. Seja direto e completo."
                  className="min-h-32 rounded-2xl"
                  disabled={!available}
                />
              </div>

              <div className="flex items-center justify-end">
                <Button
                  disabled={!available || checkpointAnswer.trim().length < 12 || completeMutation.isPending}
                  className="h-11 w-full rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90 disabled:opacity-60 md:w-auto"
                  onClick={async () => {
                    await completeMutation.mutateAsync({ checkpointAnswer });
                    toast({ title: "Checkpoint concluído", description: "Ótimo. O próximo módulo já está disponível." });
                    goNextIfAny();
                  }}
                >
                  Concluir checkpoint
                </Button>
              </div>
            </div>
          ) : null}

          {module.type === "QUIZ" && quiz ? (
            <div className="mt-6 grid gap-5">
              <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] p-4">
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Critério de aprovação</div>
                <p className="mt-1 text-sm text-muted-foreground">Nota mínima: {module.minScore ?? 70}%.</p>
              </div>

              <div className="grid gap-4">
                {quiz.questions.map((q) => (
                  <div key={q.id} className="rounded-2xl border border-[color:var(--sinaxys-border)] p-4">
                    <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                      {q.orderIndex}. {q.prompt}
                    </div>
                    <RadioGroup
                      className="mt-3 grid gap-2"
                      value={quizAnswers[q.id] ?? ""}
                      onValueChange={(v) => setQuizAnswers((prev) => ({ ...prev, [q.id]: v }))}
                      disabled={!available}
                    >
                      {quiz.optionsByQuestionId[q.id].map((o) => (
                        <div key={o.id} className="flex items-center gap-2 rounded-xl px-2 py-1 hover:bg-[color:var(--sinaxys-tint)]/40">
                          <RadioGroupItem value={o.id} id={`${q.id}_${o.id}`} />
                          <Label htmlFor={`${q.id}_${o.id}`} className="text-sm text-[color:var(--sinaxys-ink)]">
                            {o.text}
                          </Label>
                        </div>
                      ))}
                    </RadioGroup>
                  </div>
                ))}
              </div>

              {quizResult ? (
                <div className={"rounded-2xl border p-4 " + (quizResult.passed ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50")}>
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Resultado: {quizResult.score}%</div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {quizResult.passed
                      ? "Aprovado. O próximo módulo foi liberado automaticamente."
                      : `Ainda não. Nota mínima: ${quizResult.minScore}%. Revise e tente novamente.`}
                  </p>
                </div>
              ) : null}

              <div className="flex items-center justify-end">
                <Button
                  disabled={!available || quiz.questions.some((q) => !quizAnswers[q.id]) || quizMutation.isPending}
                  className="h-11 w-full rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90 disabled:opacity-60 md:w-auto"
                  onClick={async () => {
                    const result = computeQuizScore(quiz.questions, quiz.optionsByQuestionId);
                    setQuizResult(result);

                    await quizMutation.mutateAsync({ score: result.score, passed: result.passed });

                    if (result.passed) {
                      toast({ title: "Quiz aprovado", description: "Boa. O próximo módulo já foi liberado." });
                      goNextIfAny();
                    } else {
                      toast({ title: "Quiz não aprovado", description: "Sem problema — revise e tente novamente.", variant: "destructive" });
                    }
                  }}
                >
                  Enviar respostas
                </Button>
              </div>
            </div>
          ) : null}

          {mapped.assignment.status === "COMPLETED" ? (
            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white">
                <Trophy className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Trilha concluída</div>
                <p className="mt-1 text-sm text-muted-foreground">Seu certificado está disponível na área de certificados.</p>
              </div>
            </div>
          ) : null}
        </Card>
      </div>

      <div className="grid gap-6">
        <ModuleChecklist
          modules={mapped.modules}
          progressByModuleId={mapped.progressByModuleId}
          currentModuleId={module.id}
          onSelect={(id) => {
            const p = mapped.progressByModuleId[id];
            if (!p) return;
            if (p.status === "LOCKED") return;
            setCurrentModuleId(id);
          }}
        />

        <Card className="rounded-2xl border-[color:var(--sinaxys-border)] bg-white p-4">
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Pontos acumulados</div>
          <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{stats.xp}</div>
          <div className="mt-1 text-xs text-muted-foreground">Pontos é somatório de módulos concluídos.</div>
        </Card>
      </div>
    </div>
  );
}