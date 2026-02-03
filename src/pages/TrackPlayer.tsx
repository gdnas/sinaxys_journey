import { useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { CheckCircle2, Lock, Trophy } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { ModuleChecklist } from "@/components/ModuleChecklist";
import { useToast } from "@/hooks/use-toast";
import type { TrackModule } from "@/lib/domain";
import { mockDb } from "@/lib/mockDb";
import { computeProgress, getYouTubeEmbedUrl } from "@/lib/sinaxys";

export default function TrackPlayer() {
  const { toast } = useToast();
  const params = useParams();
  const assignmentId = params.assignmentId ?? "";

  const detail = mockDb.getAssignmentDetail(assignmentId);
  const [currentModuleId, setCurrentModuleId] = useState(() => {
    if (!detail) return "";
    const available = detail.modules.find((m) => detail.progressByModuleId[m.id]?.status === "AVAILABLE");
    return available?.id ?? detail.modules[0]?.id ?? "";
  });

  const module = detail?.modules.find((m) => m.id === currentModuleId);
  const mp = module ? detail?.progressByModuleId[module.id] : undefined;

  const stats = useMemo(() => {
    if (!detail) return { done: 0, total: 0, pct: 0, xp: 0 };
    const progress = Object.values(detail.progressByModuleId);
    const done = progress.filter((p) => p.status === "COMPLETED").length;
    const total = progress.length;
    const pct = computeProgress(done, total);
    const xp = detail.modules
      .filter((m) => detail.progressByModuleId[m.id]?.status === "COMPLETED")
      .reduce((acc, m) => acc + m.xpReward, 0);
    return { done, total, pct, xp };
  }, [detail]);

  const quiz = useMemo(() => {
    if (!module || module.type !== "QUIZ") return null;
    return mockDb.getQuizForModule(module.id);
  }, [module]);

  const [checkpointAnswer, setCheckpointAnswer] = useState("");
  const [quizAnswers, setQuizAnswers] = useState<Record<string, string>>({});
  const [quizResult, setQuizResult] = useState<null | { score: number; passed: boolean; minScore: number }>(null);

  if (!detail || !module || !mp) {
    return (
      <div className="rounded-3xl border bg-white p-6">
        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Trilha não encontrada</div>
        <p className="mt-1 text-sm text-muted-foreground">Verifique o link ou retorne ao seu painel.</p>
      </div>
    );
  }

  const locked = mp.status === "LOCKED";
  const completed = mp.status === "COMPLETED";
  const available = mp.status === "AVAILABLE";

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <div className="grid gap-6">
        <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
          <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
            <div>
              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trilha</div>
              <h2 className="mt-1 text-xl font-semibold text-[color:var(--sinaxys-ink)]">{detail.track.title}</h2>
              <p className="mt-2 text-sm text-muted-foreground">{detail.track.description}</p>
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
              {module.description ? (
                <p className="mt-2 text-sm text-muted-foreground">{module.description}</p>
              ) : null}
            </div>
            <div className="text-right">
              <div className="text-xs text-muted-foreground">Recompensa</div>
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">+{module.xpReward} XP</div>
            </div>
          </div>

          {locked ? (
            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white">
                <Lock className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Módulo bloqueado</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Conclua o módulo anterior para liberar este conteúdo. A sequência existe para garantir consistência no aprendizado.
                </p>
              </div>
            </div>
          ) : null}

          {/* VIDEO */}
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
                <div className="text-sm text-muted-foreground">
                  Ao concluir, você libera o próximo módulo automaticamente.
                </div>
                <Button
                  disabled={!available}
                  className="h-11 w-full rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90 disabled:opacity-60 md:w-auto"
                  onClick={() => {
                    mockDb.completeVideo(detail.assignment.id, module.id);
                    const updated = mockDb.getAssignmentDetail(detail.assignment.id);
                    if (updated) {
                      const nextAvail = updated.modules.find((m) => updated.progressByModuleId[m.id]?.status === "AVAILABLE");
                      if (nextAvail) setCurrentModuleId(nextAvail.id);
                      else setCurrentModuleId(module.id);
                    }
                    toast({
                      title: "Módulo concluído",
                      description: "Boa. Seguimos em sequência — o próximo conteúdo já foi liberado.",
                    });
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

          {/* CHECKPOINT */}
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
                <div className="text-xs text-muted-foreground">No MVP, este checkpoint é auto-conclusivo. Evolução: aprovação pelo head.</div>
              </div>

              <div className="flex items-center justify-end">
                <Button
                  disabled={!available || checkpointAnswer.trim().length < 12}
                  className="h-11 w-full rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90 disabled:opacity-60 md:w-auto"
                  onClick={() => {
                    mockDb.submitCheckpoint(detail.assignment.id, module.id, checkpointAnswer);
                    setCheckpointAnswer("");
                    const updated = mockDb.getAssignmentDetail(detail.assignment.id);
                    if (updated) {
                      const nextAvail = updated.modules.find((m) => updated.progressByModuleId[m.id]?.status === "AVAILABLE");
                      if (nextAvail) setCurrentModuleId(nextAvail.id);
                    }
                    toast({
                      title: "Checkpoint concluído",
                      description: "Ótimo. A clareza da sua resposta fortalece o aprendizado — e o próximo módulo já está disponível.",
                    });
                  }}
                >
                  Concluir checkpoint
                </Button>
              </div>
            </div>
          ) : null}

          {/* QUIZ */}
          {module.type === "QUIZ" && quiz ? (
            <div className="mt-6 grid gap-5">
              <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] p-4">
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Critério de aprovação</div>
                <p className="mt-1 text-sm text-muted-foreground">Nota mínima: {module.minScore ?? 70}%.</p>
              </div>

              <div className="grid gap-4">
                {quiz.questions.map((q) => (
                  <div key={q.id} className="rounded-2xl border border-[color:var(--sinaxys-border)] p-4">
                    <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">{q.orderIndex}. {q.prompt}</div>
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
                <div
                  className={
                    "rounded-2xl border p-4 " +
                    (quizResult.passed
                      ? "border-emerald-200 bg-emerald-50"
                      : "border-amber-200 bg-amber-50")
                  }
                >
                  <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                    Resultado: {quizResult.score}%
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {quizResult.passed
                      ? "Aprovado. O próximo módulo foi liberado automaticamente."
                      : `Ainda não. Nota mínima: ${quizResult.minScore}%. Revise e tente novamente.`}
                  </p>
                </div>
              ) : null}

              <div className="flex items-center justify-end">
                <Button
                  disabled={!available || quiz.questions.some((q) => !quizAnswers[q.id])}
                  className="h-11 w-full rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90 disabled:opacity-60 md:w-auto"
                  onClick={() => {
                    const result = mockDb.submitQuiz(detail.assignment.id, module.id, quizAnswers);
                    setQuizResult(result);
                    if (result.passed) {
                      const updated = mockDb.getAssignmentDetail(detail.assignment.id);
                      if (updated) {
                        const nextAvail = updated.modules.find((m) => updated.progressByModuleId[m.id]?.status === "AVAILABLE");
                        if (nextAvail) setCurrentModuleId(nextAvail.id);
                      }
                    }
                  }}
                >
                  Enviar respostas
                </Button>
              </div>
            </div>
          ) : null}

          {/* Conclusão da trilha */}
          {detail.assignment.status === "COMPLETED" ? (
            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white">
                <Trophy className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
              </div>
              <div>
                <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Trilha concluída</div>
                <p className="mt-1 text-sm text-muted-foreground">
                  Certificado emitido automaticamente. Você pode acessá-lo na área de certificados.
                </p>
              </div>
            </div>
          ) : null}
        </Card>
      </div>

      <div className="grid gap-6">
        <ModuleChecklist
          modules={detail.modules}
          progressByModuleId={detail.progressByModuleId}
          currentModuleId={module.id}
          onSelect={(id) => {
            const p = detail.progressByModuleId[id];
            if (!p) return;
            if (p.status === "LOCKED") return;
            setCurrentModuleId(id);
            setQuizResult(null);
          }}
        />

        <Card className="rounded-2xl border-[color:var(--sinaxys-border)] bg-white p-4">
          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">XP acumulado</div>
          <div className="mt-1 text-2xl font-semibold text-[color:var(--sinaxys-ink)]">{stats.xp}</div>
          <div className="mt-1 text-xs text-muted-foreground">Leve, útil e sem ruído: só para reforçar consistência.</div>
        </Card>
      </div>
    </div>
  );
}