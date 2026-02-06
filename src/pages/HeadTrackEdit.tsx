import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  Trash2,
  PlayCircle,
  ClipboardCheck,
  HelpCircle,
  BookOpenText,
  Pencil,
  X,
  GripVertical,
  Users,
  UserPlus,
  Eye,
  EyeOff,
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Badge } from "@/components/ui/badge";
import type { QuizOption, QuizQuestion, TrackModule } from "@/lib/domain";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { mockDb } from "@/lib/mockDb";

function typeLabel(t: TrackModule["type"]) {
  switch (t) {
    case "VIDEO":
      return "Vídeo";
    case "MATERIAL":
      return "Material";
    case "QUIZ":
      return "Quiz";
    case "CHECKPOINT":
      return "Checkpoint";
  }
}

function typeIcon(t: TrackModule["type"]) {
  switch (t) {
    case "VIDEO":
      return <PlayCircle className="h-4 w-4" />;
    case "MATERIAL":
      return <BookOpenText className="h-4 w-4" />;
    case "QUIZ":
      return <HelpCircle className="h-4 w-4" />;
    case "CHECKPOINT":
      return <ClipboardCheck className="h-4 w-4" />;
  }
}

type QuizQuestionDraft = {
  id: string;
  type: "TRUE_FALSE" | "MULTIPLE_CHOICE";
  prompt: string;
  options: { id: string; text: string; isCorrect: boolean }[];
};

function tmpId(prefix: string) {
  return `${prefix}_${Math.random().toString(16).slice(2)}_${Date.now().toString(16)}`;
}

function optionLetter(i: number) {
  return String.fromCharCode("A".charCodeAt(0) + i);
}

function makeTrueFalseQuestion(correct: "true" | "false" = "true"): QuizQuestionDraft {
  return {
    id: tmpId("qtmp"),
    type: "TRUE_FALSE",
    prompt: "",
    options: [
      { id: tmpId("otmp"), text: "Verdadeiro", isCorrect: correct === "true" },
      { id: tmpId("otmp"), text: "Falso", isCorrect: correct === "false" },
    ],
  };
}

function makeMultipleChoiceQuestion(): QuizQuestionDraft {
  const correctId = tmpId("otmp");
  return {
    id: tmpId("qtmp"),
    type: "MULTIPLE_CHOICE",
    prompt: "",
    options: [
      { id: correctId, text: "", isCorrect: true },
      { id: tmpId("otmp"), text: "", isCorrect: false },
      { id: tmpId("otmp"), text: "", isCorrect: false },
      { id: tmpId("otmp"), text: "", isCorrect: false },
    ],
  };
}

function normalizeCorrect(opts: QuizQuestionDraft["options"], correctOptionId: string) {
  return opts.map((o) => ({ ...o, isCorrect: o.id === correctOptionId }));
}

function isQuizDraftValid(minScore: string, questions: QuizQuestionDraft[]) {
  const ms = Number(minScore);
  if (!Number.isFinite(ms) || ms < 0 || ms > 100) return false;
  if (!questions.length) return false;

  for (const q of questions) {
    if (q.prompt.trim().length < 8) return false;

    const correctCount = q.options.filter((o) => o.isCorrect).length;
    if (correctCount !== 1) return false;

    if (q.type === "MULTIPLE_CHOICE") {
      if (q.options.length < 2) return false;
      if (q.options.some((o) => o.text.trim().length < 1)) return false;
    }
  }

  return true;
}

function draftFromDb(questions: QuizQuestion[], optionsByQuestionId: Record<string, QuizOption[]>): QuizQuestionDraft[] {
  return questions
    .slice()
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((q) => {
      const opts = (optionsByQuestionId[q.id] ?? []).slice();
      const correct = opts.find((o) => o.isCorrect) ?? opts[0];
      const normalized = opts.map((o) => ({ ...o, isCorrect: o.id === correct?.id }));
      return {
        id: q.id,
        type: q.type,
        prompt: q.prompt,
        options: normalized.map((o) => ({ id: o.id, text: o.text, isCorrect: o.isCorrect })),
      };
    });
}

export default function HeadTrackEdit() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { trackId } = useParams();
  const [tick, setTick] = useState(0);

  const track = useMemo(() => (trackId ? mockDb.getTrack(trackId) : null), [trackId, tick]);
  const modules = useMemo(() => (trackId ? mockDb.getModulesByTrack(trackId) : []), [trackId, tick]);

  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const deptId = user?.departmentId;

  const deptUsers = useMemo(() => {
    if (!deptId) return [];
    return mockDb
      .getUsers()
      .filter((u) => u.active && u.departmentId === deptId && u.role === "COLABORADOR")
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [deptId, tick]);

  const [assignOpen, setAssignOpen] = useState(false);
  const [assignMode, setAssignMode] = useState<"team" | "person">("team");
  const [assignUserId, setAssignUserId] = useState<string>("");
  const [assignTrackId, setAssignTrackId] = useState<string | null>(null);

  const reorder = (fromId: string, toId: string) => {
    const ordered = modules.slice().sort((a, b) => a.orderIndex - b.orderIndex);
    const from = ordered.findIndex((m) => m.id === fromId);
    const to = ordered.findIndex((m) => m.id === toId);
    if (from < 0 || to < 0 || from === to) return;

    const next = ordered.slice();
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);

    next.forEach((m, idx) => {
      const nextOrder = idx + 1;
      if (m.orderIndex === nextOrder) return;
      try {
        mockDb.upsertModule({ ...m, orderIndex: nextOrder });
      } catch (e) {
        toast({
          title: "Não foi possível salvar",
          description: e instanceof Error ? e.message : "Tente novamente.",
          variant: "destructive",
        });
      }
    });

    toast({
      title: "Ordem atualizada",
      description: "A sequência de desbloqueio foi ajustada.",
    });

    setTick((x) => x + 1);
  };

  const [trackTitle, setTrackTitle] = useState("");
  const [trackDescription, setTrackDescription] = useState("");
  const [savingTrack, setSavingTrack] = useState(false);

  useEffect(() => {
    if (!track) return;
    setTrackTitle(track.title);
    setTrackDescription(track.description);
  }, [track?.id, track?.title, track?.description]);

  const trackDirty =
    !!track && (trackTitle.trim() !== track.title.trim() || trackDescription.trim() !== track.description.trim());

  const [open, setOpen] = useState(false);
  const [moduleType, setModuleType] = useState<TrackModule["type"]>("VIDEO");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [materialUrl, setMaterialUrl] = useState("");
  const [minScore, setMinScore] = useState("70");
  const [checkpointPrompt, setCheckpointPrompt] = useState("");
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestionDraft[]>([makeTrueFalseQuestion("true")]);

  // Edit existing module
  const [editOpen, setEditOpen] = useState(false);
  const [editModuleId, setEditModuleId] = useState<string | null>(null);
  const editModule = useMemo(
    () => (editModuleId ? modules.find((m) => m.id === editModuleId) ?? null : null),
    [editModuleId, modules],
  );

  const [editTitle, setEditTitle] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editYoutubeUrl, setEditYoutubeUrl] = useState("");
  const [editMaterialUrl, setEditMaterialUrl] = useState("");
  const [editCheckpointPrompt, setEditCheckpointPrompt] = useState("");
  const [editMinScore, setEditMinScore] = useState("70");
  const [editQuizQuestions, setEditQuizQuestions] = useState<QuizQuestionDraft[]>([]);

  if (!user || user.role !== "HEAD") return null;
  if (!track || !trackId) {
    return (
      <div className="rounded-3xl border bg-white p-6">
        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Trilha não encontrada</div>
        <p className="mt-1 text-sm text-muted-foreground">Verifique o link ou volte para a lista.</p>
        <Button asChild variant="outline" className="mt-4 rounded-xl">
          <Link to="/head/tracks">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>
    );
  }

  const resetDialog = () => {
    setModuleType("VIDEO");
    setTitle("");
    setDescription("");
    setYoutubeUrl("");
    setMaterialUrl("");
    setMinScore("70");
    setCheckpointPrompt("");
    setQuizQuestions([makeTrueFalseQuestion("true")]);
  };

  const openEdit = (m: TrackModule) => {
    setEditModuleId(m.id);
    setEditTitle(m.title);
    setEditDescription(m.description ?? "");
    setEditYoutubeUrl(m.youtubeUrl ?? "");
    setEditMaterialUrl(m.materialUrl ?? "");
    setEditCheckpointPrompt(m.checkpointPrompt ?? "");
    setEditMinScore(String(m.minScore ?? 70));

    if (m.type === "QUIZ") {
      const q = mockDb.getQuizForModule(m.id);
      const draft = draftFromDb(q.questions, q.optionsByQuestionId);
      setEditQuizQuestions(draft.length ? draft : [makeTrueFalseQuestion("true")]);
    } else {
      setEditQuizQuestions([]);
    }

    setEditOpen(true);
  };

  const saveEdit = () => {
    if (!editModule) return;

    const updated: TrackModule = {
      ...editModule,
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      youtubeUrl: editModule.type === "VIDEO" ? editYoutubeUrl.trim() : undefined,
      materialUrl: editModule.type === "MATERIAL" ? editMaterialUrl.trim() : undefined,
      checkpointPrompt: editModule.type === "CHECKPOINT" ? editCheckpointPrompt.trim() : undefined,
      minScore: editModule.type === "QUIZ" ? Number(editMinScore) || 70 : undefined,
    };

    try {
      mockDb.upsertModule(updated);

      if (editModule.type === "QUIZ") {
        mockDb.replaceQuiz(editModule.id, {
          questions: editQuizQuestions.map((q) => ({
            type: q.type,
            prompt: q.prompt.trim(),
            options: q.options.map((o) => ({ text: o.text.trim(), isCorrect: o.isCorrect })),
          })),
        });
      }

      toast({
        title: "Módulo salvo",
        description: "As alterações foram aplicadas.",
      });

      setEditOpen(false);
      setTick((x) => x + 1);
    } catch (e) {
      toast({
        title: "Não foi possível salvar",
        description: e instanceof Error ? e.message : "Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const isEditValid = (() => {
    if (!editModule) return false;
    if (editTitle.trim().length < 4) return false;
    if (editModule.type === "VIDEO" && editYoutubeUrl.trim().length < 10) return false;
    if (editModule.type === "MATERIAL" && editMaterialUrl.trim().length < 10) return false;
    if (editModule.type === "CHECKPOINT" && editCheckpointPrompt.trim().length < 10) return false;
    if (editModule.type === "QUIZ" && !isQuizDraftValid(editMinScore, editQuizQuestions)) return false;
    return true;
  })();

  const nextOrder = (modules.reduce((max, m) => Math.max(max, m.orderIndex), 0) || 0) + 1;

  const isNewModuleValid =
    title.trim().length >= 4 &&
    (moduleType !== "VIDEO" || youtubeUrl.trim().length >= 10) &&
    (moduleType !== "MATERIAL" || materialUrl.trim().length >= 10) &&
    (moduleType !== "CHECKPOINT" || checkpointPrompt.trim().length >= 10) &&
    (moduleType !== "QUIZ" || isQuizDraftValid(minScore, quizQuestions));

  return (
    <div className="grid gap-6">
      {/* Edit dialog */}
      <Dialog
        open={editOpen}
        onOpenChange={(v) => {
          setEditOpen(v);
          if (!v) setEditModuleId(null);
        }}
      >
        <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Editar módulo</DialogTitle>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="grid gap-4">
              <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Tipo</div>
                <div className="mt-1 text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                  {editModule ? typeLabel(editModule.type) : "—"}
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  Atualize o conteúdo sempre que necessário — sem recriar a trilha.
                </div>
              </div>

              <div className="grid gap-2">
                <Label>Título</Label>
                <Input value={editTitle} onChange={(e) => setEditTitle(e.target.value)} className="rounded-xl" />
              </div>

              <div className="grid gap-2">
                <Label>Descrição (opcional)</Label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="min-h-24 rounded-2xl"
                />
              </div>

              {editModule?.type === "VIDEO" ? (
                <div className="grid gap-2">
                  <Label>Link do YouTube</Label>
                  <Input value={editYoutubeUrl} onChange={(e) => setEditYoutubeUrl(e.target.value)} className="rounded-xl" />
                </div>
              ) : null}

              {editModule?.type === "MATERIAL" ? (
                <div className="grid gap-2">
                  <Label>Link do material (Figma, ClickUp ou outro)</Label>
                  <Input
                    value={editMaterialUrl}
                    onChange={(e) => setEditMaterialUrl(e.target.value)}
                    className="rounded-xl"
                    placeholder="https://..."
                  />
                </div>
              ) : null}

              {editModule?.type === "CHECKPOINT" ? (
                <div className="grid gap-2">
                  <Label>Pergunta do checkpoint</Label>
                  <Textarea
                    value={editCheckpointPrompt}
                    onChange={(e) => setEditCheckpointPrompt(e.target.value)}
                    className="min-h-24 rounded-2xl"
                  />
                </div>
              ) : null}

              {editModule?.type === "QUIZ" ? (
                <div className="grid gap-4">
                  <div className="grid gap-2">
                    <Label>Nota mínima (%)</Label>
                    <Input
                      value={editMinScore}
                      onChange={(e) => setEditMinScore(e.target.value)}
                      className="rounded-xl"
                      inputMode="numeric"
                    />
                    <div className="text-xs text-muted-foreground">
                      Perguntas de múltipla escolha (A, B, C, D…). Uma alternativa correta por pergunta.
                    </div>
                  </div>

                  <Separator />

                  <div className="flex items-center justify-between gap-3">
                    <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Perguntas</div>
                    <Button
                      variant="outline"
                      className="rounded-xl"
                      onClick={() => setEditQuizQuestions((prev) => [...prev, makeMultipleChoiceQuestion()])}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Adicionar pergunta
                    </Button>
                  </div>

                  <div className="grid gap-3">
                    {editQuizQuestions.map((q, idx) => {
                      const correctId = q.options.find((o) => o.isCorrect)?.id ?? q.options[0]?.id;
                      return (
                        <div key={q.id} className="rounded-2xl border border-[color:var(--sinaxys-border)] p-4">
                          <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                            <div className="min-w-0">
                              <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                Pergunta {idx + 1}
                              </div>
                              <div className="mt-1 text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                                {q.type === "TRUE_FALSE" ? "Verdadeiro/Falso" : "Múltipla escolha"}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Select
                                value={q.type}
                                onValueChange={(v) => {
                                  setEditQuizQuestions((prev) =>
                                    prev.map((x) => {
                                      if (x.id !== q.id) return x;
                                      return v === "TRUE_FALSE"
                                        ? { ...makeTrueFalseQuestion("true"), id: x.id, prompt: x.prompt }
                                        : { ...makeMultipleChoiceQuestion(), id: x.id, prompt: x.prompt };
                                    }),
                                  );
                                }}
                              >
                                <SelectTrigger className="h-9 w-[180px] rounded-xl">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="TRUE_FALSE">Verdadeiro/Falso</SelectItem>
                                  <SelectItem value="MULTIPLE_CHOICE">Múltipla escolha</SelectItem>
                                </SelectContent>
                              </Select>
                              <Button
                                variant="outline"
                                size="icon"
                                className="h-9 w-9 rounded-xl"
                                disabled={editQuizQuestions.length === 1}
                                onClick={() => setEditQuizQuestions((prev) => prev.filter((x) => x.id !== q.id))}
                                aria-label="Remover pergunta"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          <div className="mt-4 grid gap-2">
                            <Label>Enunciado</Label>
                            <Textarea
                              value={q.prompt}
                              onChange={(e) =>
                                setEditQuizQuestions((prev) =>
                                  prev.map((x) => (x.id === q.id ? { ...x, prompt: e.target.value } : x)),
                                )
                              }
                              className="min-h-20 rounded-2xl"
                            />
                          </div>

                          <div className="mt-4 grid gap-2">
                            <Label>Alternativas</Label>

                            {q.type === "TRUE_FALSE" ? (
                              <Select
                                value={correctId}
                                onValueChange={(v) =>
                                  setEditQuizQuestions((prev) =>
                                    prev.map((x) => (x.id === q.id ? { ...x, options: normalizeCorrect(x.options, v) } : x)),
                                  )
                                }
                              >
                                <SelectTrigger className="rounded-xl">
                                  <SelectValue placeholder="Selecione a correta" />
                                </SelectTrigger>
                                <SelectContent>
                                  {q.options.map((o) => (
                                    <SelectItem key={o.id} value={o.id}>
                                      {o.text}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            ) : (
                              <RadioGroup
                                value={correctId}
                                onValueChange={(v) =>
                                  setEditQuizQuestions((prev) =>
                                    prev.map((x) => (x.id === q.id ? { ...x, options: normalizeCorrect(x.options, v) } : x)),
                                  )
                                }
                                className="grid gap-2"
                              >
                                {q.options.map((o, optIdx) => (
                                  <div
                                    key={o.id}
                                    className="flex items-center gap-2 rounded-xl border border-[color:var(--sinaxys-border)] bg-white px-3 py-2"
                                  >
                                    <RadioGroupItem value={o.id} id={`${q.id}_${o.id}`} />
                                    <div className="w-8 text-xs font-semibold text-muted-foreground">
                                      {optionLetter(optIdx)}
                                    </div>
                                    <Input
                                      value={o.text}
                                      onChange={(e) =>
                                        setEditQuizQuestions((prev) =>
                                          prev.map((x) => {
                                            if (x.id !== q.id) return x;
                                            return {
                                              ...x,
                                              options: x.options.map((y) =>
                                                y.id === o.id ? { ...y, text: e.target.value } : y,
                                              ),
                                            };
                                          }),
                                        )
                                      }
                                      placeholder={`Opção ${optionLetter(optIdx)}`}
                                      className="h-10 rounded-xl"
                                    />
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-9 w-9 rounded-xl"
                                      disabled={q.options.length <= 2}
                                      onClick={() => {
                                        setEditQuizQuestions((prev) =>
                                          prev.map((x) => {
                                            if (x.id !== q.id) return x;
                                            const nextOpts = x.options.filter((y) => y.id !== o.id);
                                            const nextCorrectId =
                                              nextOpts.find((y) => y.isCorrect)?.id ?? nextOpts[0]?.id;
                                            return {
                                              ...x,
                                              options: normalizeCorrect(nextOpts, nextCorrectId),
                                            };
                                          }),
                                        );
                                      }}
                                      aria-label="Remover alternativa"
                                    >
                                      <X className="h-4 w-4" />
                                    </Button>
                                  </div>
                                ))}

                                <div className="pt-1">
                                  <Button
                                    variant="outline"
                                    className="rounded-xl"
                                    disabled={q.options.length >= 6}
                                    onClick={() => {
                                      setEditQuizQuestions((prev) =>
                                        prev.map((x) =>
                                          x.id === q.id
                                            ? {
                                                ...x,
                                                options: [...x.options, { id: tmpId("otmp"), text: "", isCorrect: false }],
                                              }
                                            : x,
                                        ),
                                      );
                                    }}
                                  >
                                    <Plus className="mr-2 h-4 w-4" />
                                    Adicionar alternativa
                                  </Button>
                                </div>
                              </RadioGroup>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </ScrollArea>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="w-full rounded-xl sm:w-auto" onClick={() => setEditOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="w-full rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90 sm:w-auto"
              disabled={!isEditValid}
              onClick={saveEdit}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Track header + edit */}
      <div className="rounded-3xl border bg-white p-6">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
          <div className="min-w-0">
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Editor de trilha</div>
            <div className="mt-2 grid gap-2">
              <Label>Nome da trilha</Label>
              <Input
                value={trackTitle}
                onChange={(e) => setTrackTitle(e.target.value)}
                className="rounded-xl"
                placeholder="Ex.: Onboarding — Produto"
              />
            </div>
            <div className="mt-3 grid gap-2">
              <Label>Descrição</Label>
              <Textarea
                value={trackDescription}
                onChange={(e) => setTrackDescription(e.target.value)}
                className="min-h-24 rounded-2xl"
                placeholder="Explique o objetivo da trilha em 2–3 frases."
              />
            </div>

            <div className="mt-3 flex flex-col gap-2 sm:flex-row">
              <Button
                className="w-full rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90 sm:w-auto"
                disabled={savingTrack || !trackDirty || trackTitle.trim().length < 6 || trackDescription.trim().length < 10}
                onClick={() => {
                  setSavingTrack(true);
                  try {
                    const updated = mockDb.updateTrack({ trackId: track.id, title: trackTitle, description: trackDescription });
                    const after = mockDb.getTrack(track.id);
                    setTick((x) => x + 1);

                    const ok =
                      !!updated &&
                      !!after &&
                      after.title.trim() === trackTitle.trim() &&
                      after.description.trim() === trackDescription.trim();

                    toast(
                      ok
                        ? {
                            title: "Trilha salva",
                            description: "Nome e descrição atualizados com sucesso.",
                          }
                        : {
                            title: "Não foi possível salvar",
                            description:
                              "A alteração não foi persistida. Tente novamente e, se continuar, atualize a página.",
                            variant: "destructive",
                          },
                    );
                  } catch (e) {
                    toast({
                      title: "Não foi possível salvar",
                      description: e instanceof Error ? e.message : "Tente novamente.",
                      variant: "destructive",
                    });
                  } finally {
                    setSavingTrack(false);
                  }
                }}
              >
                {savingTrack ? "Salvando…" : "Salvar trilha"}
              </Button>
              <Button
                variant="outline"
                className="w-full rounded-xl sm:w-auto"
                disabled={!trackDirty}
                onClick={() => {
                  setTrackTitle(track.title);
                  setTrackDescription(track.description);
                }}
              >
                Descartar alterações
              </Button>
            </div>
          </div>

          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Badge
              className={
                "rounded-full " +
                (track.published
                  ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100"
                  : "bg-amber-100 text-amber-800 hover:bg-amber-100")
              }
            >
              {track.published ? "Publicada" : "Rascunho"}
            </Badge>

            <Button
              variant="outline"
              className="w-full rounded-xl sm:w-auto"
              onClick={() => {
                try {
                  mockDb.setTrackPublished(track.id, !track.published);
                  toast({
                    title: track.published ? "Trilha despublicada" : "Trilha publicada",
                    description: track.published
                      ? "Ela deixa de aparecer para o time."
                      : "Agora você pode atribuir para pessoas/equipe.",
                  });
                  setTick((x) => x + 1);
                } catch (e) {
                  toast({
                    title: "Não foi possível atualizar",
                    description: e instanceof Error ? e.message : "Tente novamente.",
                    variant: "destructive",
                  });
                }
              }}
            >
              {track.published ? (
                <>
                  <EyeOff className="mr-2 h-4 w-4" />
                  Despublicar
                </>
              ) : (
                <>
                  <Eye className="mr-2 h-4 w-4" />
                  Publicar
                </>
              )}
            </Button>

            <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
              <DialogTrigger asChild>
                <Button
                  className="w-full rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90 sm:w-auto"
                  disabled={!track.published}
                  title={!track.published ? "Publique a trilha para poder atribuir" : undefined}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Atribuir
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle>Atribuir trilha</DialogTitle>
                </DialogHeader>

                <div className="grid gap-3">
                  {!track.published ? (
                    <div className="rounded-2xl bg-amber-50 p-3 text-sm text-amber-900">
                      Publique a trilha para conseguir atribuir.
                    </div>
                  ) : null}

                  <div className="grid gap-2">
                    <Label>Destino</Label>
                    <Select value={assignMode} onValueChange={(v) => setAssignMode(v as any)}>
                      <SelectTrigger className="rounded-xl">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="team">Equipe (departamento)</SelectItem>
                        <SelectItem value="person">Pessoa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {assignMode === "team" ? (
                    <div className="rounded-2xl border border-[color:var(--sinaxys-border)] p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Equipe do departamento</div>
                          <div className="mt-1 text-xs text-muted-foreground">
                            {deptUsers.length} colaboradores ativos serão atribuídos.
                          </div>
                        </div>
                        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                          <Users className="h-5 w-5" />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid gap-2">
                      <Label>Pessoa</Label>
                      <Select value={assignUserId} onValueChange={setAssignUserId}>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Selecione…" />
                        </SelectTrigger>
                        <SelectContent>
                          {deptUsers.map((u) => (
                            <SelectItem key={u.id} value={u.id}>
                              {u.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>

                <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button variant="outline" className="w-full rounded-xl sm:w-auto" onClick={() => setAssignOpen(false)}>
                    Cancelar
                  </Button>
                  <Button
                    className="w-full rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90 sm:w-auto"
                    disabled={!track.published || (assignMode === "team" ? deptUsers.length === 0 : !assignUserId)}
                    onClick={() => {
                      try {
                        if (!track.published) return;

                        if (assignMode === "team") {
                          deptUsers.forEach((u) => {
                            mockDb.assignTrack({ trackId: track.id, userId: u.id, assignedByUserId: user.id });
                          });
                          toast({
                            title: "Trilha atribuída",
                            description: `Enviada para ${deptUsers.length} colaboradores.`,
                          });
                        } else {
                          mockDb.assignTrack({ trackId: track.id, userId: assignUserId, assignedByUserId: user.id });
                          const name = deptUsers.find((x) => x.id === assignUserId)?.name;
                          toast({
                            title: "Trilha atribuída",
                            description: name ? `Enviada para ${name}.` : "Enviada.",
                          });
                        }

                        setAssignOpen(false);
                        setAssignUserId("");
                        setTick((x) => x + 1);
                      } catch (e) {
                        toast({
                          title: "Não foi possível atribuir",
                          description: e instanceof Error ? e.message : "Tente novamente.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    Atribuir
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            <Button asChild variant="outline" className="w-full rounded-xl sm:w-auto">
              <Link to="/head/tracks">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Voltar
              </Link>
            </Button>

            <Dialog
              open={open}
              onOpenChange={(v) => {
                setOpen(v);
                if (!v) resetDialog();
              }}
            >
              <DialogTrigger asChild>
                <Button className="w-full rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90 sm:w-auto">
                  <Plus className="mr-2 h-4 w-4" />
                  Adicionar módulo
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Novo módulo</DialogTitle>
                </DialogHeader>

                <ScrollArea className="max-h-[70vh] pr-4">
                  <div className="grid gap-4">
                    <div className="grid gap-2">
                      <Label>Tipo</Label>
                      <Select value={moduleType} onValueChange={(v) => setModuleType(v as TrackModule["type"]) }>
                        <SelectTrigger className="rounded-xl">
                          <SelectValue placeholder="Selecione…" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="VIDEO">Vídeo</SelectItem>
                          <SelectItem value="MATERIAL">Material (link)</SelectItem>
                          <SelectItem value="QUIZ">Quiz</SelectItem>
                          <SelectItem value="CHECKPOINT">Checkpoint</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-2">
                      <Label>Título</Label>
                      <Input value={title} onChange={(e) => setTitle(e.target.value)} className="rounded-xl" />
                    </div>

                    <div className="grid gap-2">
                      <Label>Descrição (opcional)</Label>
                      <Textarea value={description} onChange={(e) => setDescription(e.target.value)} className="min-h-24 rounded-2xl" />
                    </div>

                    {moduleType === "VIDEO" ? (
                      <div className="grid gap-2">
                        <Label>Link do YouTube</Label>
                        <Input value={youtubeUrl} onChange={(e) => setYoutubeUrl(e.target.value)} className="rounded-xl" placeholder="https://www.youtube.com/watch?v=..." />
                      </div>
                    ) : null}

                    {moduleType === "MATERIAL" ? (
                      <div className="grid gap-2">
                        <Label>Link do material (Figma, ClickUp ou outro)</Label>
                        <Input
                          value={materialUrl}
                          onChange={(e) => setMaterialUrl(e.target.value)}
                          className="rounded-xl"
                          placeholder="https://..."
                        />
                        <div className="text-xs text-muted-foreground">
                          Aceita links externos (ex.: Figma, ClickUp, Notion, Drive). Se não der para embutir, o aluno abre em nova aba.
                        </div>
                      </div>
                    ) : null}

                    {moduleType === "CHECKPOINT" ? (
                      <div className="grid gap-2">
                        <Label>Pergunta do checkpoint</Label>
                        <Textarea value={checkpointPrompt} onChange={(e) => setCheckpointPrompt(e.target.value)} className="min-h-24 rounded-2xl" placeholder="Ex.: Em 4–6 linhas, descreva…" />
                      </div>
                    ) : null}

                    {moduleType === "QUIZ" ? (
                      <div className="grid gap-4">
                        <div className="grid gap-2">
                          <Label>Nota mínima (%)</Label>
                          <Input value={minScore} onChange={(e) => setMinScore(e.target.value)} className="rounded-xl" inputMode="numeric" />
                          <div className="text-xs text-muted-foreground">
                            Você pode criar perguntas de Verdadeiro/Falso ou Múltipla escolha (A, B, C, D…).
                          </div>
                        </div>

                        <Separator />

                        <div className="flex items-center justify-between gap-3">
                          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Perguntas</div>
                          <div className="flex flex-wrap items-center gap-2">
                            <Button
                              variant="outline"
                              className="rounded-xl"
                              onClick={() => setQuizQuestions((prev) => [...prev, makeTrueFalseQuestion("true")])}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              V/F
                            </Button>
                            <Button
                              variant="outline"
                              className="rounded-xl"
                              onClick={() => setQuizQuestions((prev) => [...prev, makeMultipleChoiceQuestion()])}
                            >
                              <Plus className="mr-2 h-4 w-4" />
                              Múltipla escolha
                            </Button>
                          </div>
                        </div>

                        <div className="grid gap-3">
                          {quizQuestions.map((q, idx) => {
                            const correctId = q.options.find((o) => o.isCorrect)?.id ?? q.options[0]?.id;
                            return (
                              <div key={q.id} className="rounded-2xl border border-[color:var(--sinaxys-border)] p-4">
                                <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                                  <div className="min-w-0">
                                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                                      Pergunta {idx + 1}
                                    </div>
                                    <div className="mt-1 text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                                      {q.type === "TRUE_FALSE" ? "Verdadeiro/Falso" : "Múltipla escolha"}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Select
                                      value={q.type}
                                      onValueChange={(v) => {
                                        setQuizQuestions((prev) =>
                                          prev.map((x) => {
                                            if (x.id !== q.id) return x;
                                            return v === "TRUE_FALSE"
                                              ? { ...makeTrueFalseQuestion("true"), id: x.id, prompt: x.prompt }
                                              : { ...makeMultipleChoiceQuestion(), id: x.id, prompt: x.prompt };
                                          }),
                                        );
                                      }}
                                    >
                                      <SelectTrigger className="h-9 w-[180px] rounded-xl">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="TRUE_FALSE">Verdadeiro/Falso</SelectItem>
                                        <SelectItem value="MULTIPLE_CHOICE">Múltipla escolha</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      className="h-9 w-9 rounded-xl"
                                      disabled={quizQuestions.length === 1}
                                      onClick={() => setQuizQuestions((prev) => prev.filter((x) => x.id !== q.id))}
                                      aria-label="Remover pergunta"
                                    >
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </div>
                                </div>

                                <div className="mt-4 grid gap-2">
                                  <Label>Enunciado</Label>
                                  <Textarea
                                    value={q.prompt}
                                    onChange={(e) =>
                                      setQuizQuestions((prev) =>
                                        prev.map((x) => (x.id === q.id ? { ...x, prompt: e.target.value } : x)),
                                      )
                                    }
                                    className="min-h-20 rounded-2xl"
                                  />
                                </div>

                                <div className="mt-4 grid gap-2">
                                  <Label>Alternativas</Label>

                                  {q.type === "TRUE_FALSE" ? (
                                    <Select
                                      value={correctId}
                                      onValueChange={(v) =>
                                        setQuizQuestions((prev) =>
                                          prev.map((x) => (x.id === q.id ? { ...x, options: normalizeCorrect(x.options, v) } : x)),
                                        )
                                      }
                                    >
                                      <SelectTrigger className="rounded-xl">
                                        <SelectValue placeholder="Selecione a correta" />
                                      </SelectTrigger>
                                      <SelectContent>
                                        {q.options.map((o) => (
                                          <SelectItem key={o.id} value={o.id}>
                                            {o.text}
                                          </SelectItem>
                                        ))}
                                      </SelectContent>
                                    </Select>
                                  ) : (
                                    <RadioGroup
                                      value={correctId}
                                      onValueChange={(v) =>
                                        setQuizQuestions((prev) =>
                                          prev.map((x) => (x.id === q.id ? { ...x, options: normalizeCorrect(x.options, v) } : x)),
                                        )
                                      }
                                      className="grid gap-2"
                                    >
                                      {q.options.map((o, optIdx) => (
                                        <div
                                          key={o.id}
                                          className="flex items-center gap-2 rounded-xl border border-[color:var(--sinaxys-border)] bg-white px-3 py-2"
                                        >
                                          <RadioGroupItem value={o.id} id={`${q.id}_${o.id}`} />
                                          <div className="w-8 text-xs font-semibold text-muted-foreground">
                                            {optionLetter(optIdx)}
                                          </div>
                                          <Input
                                            value={o.text}
                                            onChange={(e) =>
                                              setQuizQuestions((prev) =>
                                                prev.map((x) => {
                                                  if (x.id !== q.id) return x;
                                                  return {
                                                    ...x,
                                                    options: x.options.map((y) =>
                                                      y.id === o.id ? { ...y, text: e.target.value } : y,
                                                    ),
                                                  };
                                                }),
                                              )
                                            }
                                            placeholder={`Opção ${optionLetter(optIdx)}`}
                                            className="h-10 rounded-xl"
                                          />
                                          <Button
                                            variant="outline"
                                            size="icon"
                                            className="h-9 w-9 rounded-xl"
                                            disabled={q.options.length <= 2}
                                            onClick={() => {
                                              setQuizQuestions((prev) =>
                                                prev.map((x) => {
                                                  if (x.id !== q.id) return x;
                                                  const nextOpts = x.options.filter((y) => y.id !== o.id);
                                                  const nextCorrectId =
                                                    nextOpts.find((y) => y.isCorrect)?.id ?? nextOpts[0]?.id;
                                                  return {
                                                    ...x,
                                                    options: normalizeCorrect(nextOpts, nextCorrectId),
                                                  };
                                                }),
                                              );
                                            }}
                                            aria-label="Remover alternativa"
                                          >
                                            <X className="h-4 w-4" />
                                          </Button>
                                        </div>
                                      ))}

                                      <div className="pt-1">
                                        <Button
                                          variant="outline"
                                          className="rounded-xl"
                                          disabled={q.options.length >= 6}
                                          onClick={() => {
                                            setQuizQuestions((prev) =>
                                              prev.map((x) =>
                                                x.id === q.id
                                                  ? {
                                                      ...x,
                                                      options: [...x.options, { id: tmpId("otmp"), text: "", isCorrect: false }],
                                                    }
                                                  : x,
                                              ),
                                            );
                                          }}
                                        >
                                          <Plus className="mr-2 h-4 w-4" />
                                          Adicionar alternativa
                                        </Button>
                                      </div>
                                    </RadioGroup>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </ScrollArea>

                <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  <Button
                    className="w-full rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90 sm:w-auto"
                    disabled={!isNewModuleValid}
                    onClick={() => {
                      try {
                        const id = mockDb.uid("mod");
                        const base: TrackModule = {
                          id,
                          trackId,
                          orderIndex: nextOrder,
                          type: moduleType,
                          title: title.trim(),
                          description: description.trim() || undefined,
                          xpReward: moduleType === "VIDEO" ? 20 : moduleType === "MATERIAL" ? 20 : moduleType === "CHECKPOINT" ? 30 : 40,
                          youtubeUrl: moduleType === "VIDEO" ? youtubeUrl.trim() : undefined,
                          materialUrl: moduleType === "MATERIAL" ? materialUrl.trim() : undefined,
                          checkpointPrompt: moduleType === "CHECKPOINT" ? checkpointPrompt.trim() : undefined,
                          minScore: moduleType === "QUIZ" ? Number(minScore) || 70 : undefined,
                        };

                        mockDb.upsertModule(base);

                        if (moduleType === "QUIZ") {
                          mockDb.replaceQuiz(id, {
                            questions: quizQuestions.map((q) => ({
                              type: q.type,
                              prompt: q.prompt.trim(),
                              options: q.options.map((o) => ({ text: o.text.trim(), isCorrect: o.isCorrect })),
                            })),
                          });
                        }

                        toast({
                          title: "Módulo adicionado",
                          description: "Ele já foi salvo na trilha.",
                        });

                        setOpen(false);
                        resetDialog();
                        setTick((x) => x + 1);
                      } catch (e) {
                        toast({
                          title: "Não foi possível salvar",
                          description: e instanceof Error ? e.message : "Tente novamente.",
                          variant: "destructive",
                        });
                      }
                    }}
                  >
                    Adicionar
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Módulos</div>
        <p className="mt-1 text-sm text-muted-foreground">
          A sequência é obrigatória: arraste os cards para ajustar o desbloqueio.
        </p>

        <div className="mt-4 grid gap-3">
          {modules.length ? (
            modules
              .slice()
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((m, idx) => {
                const over = dragOverId === m.id && draggingId && draggingId !== m.id;
                return (
                  <div
                    key={m.id}
                    onDragOver={(e) => {
                      e.preventDefault();
                      if (draggingId) setDragOverId(m.id);
                    }}
                    onDragLeave={() => {
                      if (dragOverId === m.id) setDragOverId(null);
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const fromId = e.dataTransfer.getData("text/plain") || draggingId;
                      if (!fromId) return;
                      reorder(fromId, m.id);
                      setDraggingId(null);
                      setDragOverId(null);
                    }}
                    className={
                      "rounded-2xl border p-4 transition " +
                      (over
                        ? "border-[color:var(--sinaxys-primary)] bg-[color:var(--sinaxys-tint)]/60"
                        : "border-[color:var(--sinaxys-border)]")
                    }
                  >
                    <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <button
                            draggable
                            onDragStart={(e) => {
                              e.dataTransfer.setData("text/plain", m.id);
                              e.dataTransfer.effectAllowed = "move";
                              setDraggingId(m.id);
                              setDragOverId(null);
                            }}
                            onDragEnd={() => {
                              setDraggingId(null);
                              setDragOverId(null);
                            }}
                            className="grid h-9 w-9 place-items-center rounded-xl border border-[color:var(--sinaxys-border)] bg-white text-muted-foreground transition hover:bg-[color:var(--sinaxys-tint)] active:cursor-grabbing"
                            aria-label="Arrastar para reordenar"
                            title="Arrastar para reordenar"
                          >
                            <GripVertical className="h-4 w-4" />
                          </button>

                          <div className="grid h-9 w-9 place-items-center rounded-xl bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-primary)]">
                            {typeIcon(m.type)}
                          </div>
                          <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                              {idx + 1}. {m.title}
                            </div>
                            <div className="mt-0.5 text-xs text-muted-foreground">{typeLabel(m.type)} • +{m.xpReward} XP</div>
                          </div>
                        </div>

                        {m.description ? (
                          <div className="mt-2 text-sm text-muted-foreground">{m.description}</div>
                        ) : null}

                        {m.type === "VIDEO" && m.youtubeUrl ? (
                          <div className="mt-2 text-xs text-muted-foreground">YouTube: {m.youtubeUrl}</div>
                        ) : null}
                        {m.type === "MATERIAL" && m.materialUrl ? (
                          <div className="mt-2 text-xs text-muted-foreground">Material: {m.materialUrl}</div>
                        ) : null}
                        {m.type === "QUIZ" ? (
                          <div className="mt-2 text-xs text-muted-foreground">Nota mínima: {m.minScore ?? 70}%</div>
                        ) : null}
                        {m.type === "CHECKPOINT" && m.checkpointPrompt ? (
                          <div className="mt-2 text-xs text-muted-foreground">Pergunta: {m.checkpointPrompt}</div>
                        ) : null}
                      </div>

                      <div className="flex flex-wrap items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="icon"
                          className="rounded-xl"
                          onClick={() => openEdit(m)}
                          aria-label="Editar módulo"
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="icon"
                          className="rounded-xl"
                          onClick={() => {
                            try {
                              mockDb.deleteModule(m.id);
                              toast({ title: "Módulo removido" });
                              setTick((x) => x + 1);
                            } catch (e) {
                              toast({
                                title: "Não foi possível remover",
                                description: e instanceof Error ? e.message : "Tente novamente.",
                                variant: "destructive",
                              });
                            }
                          }}
                          aria-label="Remover módulo"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })
          ) : (
            <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
              Sem módulos ainda. Adicione o primeiro para estruturar a sequência.
            </div>
          )}
        </div>
      </Card>
    </div>
  );
}