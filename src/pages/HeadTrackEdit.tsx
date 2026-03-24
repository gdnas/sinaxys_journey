import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  FileText,
  HelpCircle,
  LayoutList,
  PlayCircle,
  Plus,
  Save,
  Trash2,
} from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import type { QuizQuestion, TrackModule } from "@/lib/domain";
import {
  deleteModule,
  getModulesByTrack,
  getQuizForModule,
  getTrack,
  replaceQuiz,
  setTrackPublished,
  upsertModule,
  updateTrack,
  type DbModule,
} from "@/lib/journeyDb";

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

function typeLabel(t: TrackModule["type"]) {
  if (t === "VIDEO") return ""; // hide text label for videos (keep only icon)
  if (t === "MATERIAL") return "Material";
  if (t === "CHECKPOINT") return "Checkpoint";
  return "Quiz";
}

function typeIcon(t: TrackModule["type"]) {
  if (t === "VIDEO") return <PlayCircle className="h-4 w-4" />;
  if (t === "MATERIAL") return <FileText className="h-4 w-4" />;
  if (t === "CHECKPOINT") return <LayoutList className="h-4 w-4" />;
  return <HelpCircle className="h-4 w-4" />;
}

type QuizDraftQuestion = {
  type: QuizQuestion["type"];
  prompt: string;
  options: Array<{ text: string; isCorrect: boolean }>;
};

export default function HeadTrackEdit() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { trackId } = useParams<{ trackId: string }>();

  if (!user || (user.role !== "HEAD" && user.role !== "ADMIN")) return null;
  if (!trackId) return null;

  const backPath = user.role === "ADMIN" ? "/admin/tracks" : "/head/tracks";

  const { data: track, isLoading: trackLoading } = useQuery({
    queryKey: ["track", trackId],
    queryFn: () => getTrack(trackId),
  });

  const { data: modulesRaw = [], isLoading: modsLoading } = useQuery({
    queryKey: ["modules", trackId],
    queryFn: () => getModulesByTrack(trackId),
  });

  const modules = useMemo(() => modulesRaw.map(mapDbModule).sort((a, b) => a.orderIndex - b.orderIndex), [modulesRaw]);

  // Track form
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [published, setPublished] = useState(false);

  useEffect(() => {
    if (!track) return;
    setTitle(track.title);
    setDescription(track.description);
    setPublished(!!track.published);
  }, [track?.id]);

  const dirtyTrack = !!track && (title.trim() !== track.title || description.trim() !== track.description || published !== track.published);

  const saveTrackMutation = useMutation({
    mutationFn: async () => {
      if (!track) return;
      await updateTrack({ trackId: track.id, title, description });
      if (published !== track.published) await setTrackPublished(track.id, published);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["track", trackId] });
      toast({ title: "Trilha atualizada" });
    },
  });

  // Module dialog
  const [moduleOpen, setModuleOpen] = useState(false);
  const [editingModuleId, setEditingModuleId] = useState<string | null>(null);
  const editingModule = useMemo(() => modules.find((m) => m.id === editingModuleId) ?? null, [modules, editingModuleId]);

  const [mType, setMType] = useState<TrackModule["type"]>("VIDEO");
  const [mTitle, setMTitle] = useState("");
  const [mDesc, setMDesc] = useState("");
  const [mXp, setMXp] = useState<string>("20");
  const [mYoutube, setMYoutube] = useState("");
  const [mMaterial, setMMaterial] = useState("");
  const [mCheckpoint, setMCheckpoint] = useState("");
  const [mMinScore, setMMinScore] = useState<string>("70");

  useEffect(() => {
    if (!moduleOpen) return;
    if (!editingModule) {
      setMType("VIDEO");
      setMTitle("");
      setMDesc("");
      setMXp("20");
      setMYoutube("");
      setMMaterial("");
      setMCheckpoint("");
      setMMinScore("70");
      return;
    }

    setMType(editingModule.type);
    setMTitle(editingModule.title);
    setMDesc(editingModule.description ?? "");
    setMXp(String(editingModule.xpReward ?? 0));
    setMYoutube(editingModule.youtubeUrl ?? "");
    setMMaterial(editingModule.materialUrl ?? "");
    setMCheckpoint(editingModule.checkpointPrompt ?? "");
    setMMinScore(String(editingModule.minScore ?? 70));
  }, [moduleOpen, editingModuleId]);

  const saveModuleMutation = useMutation({
    mutationFn: async () => {
      const orderIndex = editingModule?.orderIndex ?? (modules[modules.length - 1]?.orderIndex ?? 0) + 1;

      // helper to detect youtube links
      function isYouTubeUrlLocal(url: string) {
        try {
          const parsed = new URL(url);
          const hn = parsed.hostname.replace("www.", "");
          return hn === "youtube.com" || hn === "m.youtube.com" || hn === "youtu.be";
        } catch {
          return false;
        }
      }

      const payload: TrackModule & { trackId: string } = {
        id: editingModule?.id ?? crypto.randomUUID(),
        trackId,
        orderIndex,
        type: mType,
        title: mTitle.trim(),
        description: mDesc.trim() || undefined,
        xpReward: Math.max(0, Math.floor(Number(mXp) || 0)),
        youtubeUrl:
          mType === "VIDEO"
            ? mYoutube.trim() || undefined
            : mType === "MATERIAL" && isYouTubeUrlLocal(mMaterial.trim())
            ? mMaterial.trim()
            : undefined,
        materialUrl: mType === "MATERIAL" ? mMaterial.trim() || undefined : undefined,
        checkpointPrompt: mType === "CHECKPOINT" ? mCheckpoint.trim() || undefined : undefined,
        minScore: mType === "QUIZ" ? Math.max(0, Math.min(100, Math.floor(Number(mMinScore) || 70))) : undefined,
      };

      await upsertModule(payload);

      // If new QUIZ, ensure there is at least a baseline quiz.
      if (mType === "QUIZ" && !editingModule) {
        await replaceQuiz(payload.id, {
          questions: [
            {
              type: "MULTIPLE_CHOICE",
              prompt: "Pergunta 1",
              options: [
                { text: "Opção A", isCorrect: true },
                { text: "Opção B", isCorrect: false },
              ],
            },
          ],
        });
      }
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["modules", trackId] });
      toast({ title: "Módulo salvo" });
      setModuleOpen(false);
      setEditingModuleId(null);
    },
  });

  const deleteModuleMutation = useMutation({
    mutationFn: async (moduleId: string) => {
      await deleteModule(moduleId);
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["modules", trackId] });
      toast({ title: "Módulo removido" });
    },
  });

  const moveModule = async (id: string, dir: -1 | 1) => {
    const idx = modules.findIndex((m) => m.id === id);
    if (idx < 0) return;
    const targetIdx = idx + dir;
    if (targetIdx < 0 || targetIdx >= modules.length) return;

    const a = modules[idx];
    const b = modules[targetIdx];

    // swap order indexes
    await upsertModule({ ...a, trackId, orderIndex: b.orderIndex });
    await upsertModule({ ...b, trackId, orderIndex: a.orderIndex });
    await qc.invalidateQueries({ queryKey: ["modules", trackId] });
  };

  // Quiz editor
  const [quizOpen, setQuizOpen] = useState(false);
  const [quizModuleId, setQuizModuleId] = useState<string | null>(null);

  const { data: quizData } = useQuery({
    queryKey: ["quiz-editor", quizModuleId],
    queryFn: async () => {
      if (!quizModuleId) return null;
      return getQuizForModule(quizModuleId);
    },
    enabled: !!quizModuleId,
  });

  const [quizDraft, setQuizDraft] = useState<QuizDraftQuestion[]>([]);

  useEffect(() => {
    if (!quizOpen) return;
    if (!quizData) {
      setQuizDraft([]);
      return;
    }

    const next: QuizDraftQuestion[] = quizData.questions.map((q) => {
      const opts = quizData.optionsByQuestionId[q.id] ?? [];
      return {
        type: q.type,
        prompt: q.prompt,
        options: opts.map((o) => ({ text: o.text, isCorrect: !!o.isCorrect })),
      };
    });

    setQuizDraft(next);
  }, [quizOpen, quizData?.questions.length, quizModuleId]);

  const saveQuizMutation = useMutation({
    mutationFn: async () => {
      if (!quizModuleId) return;
      const clean = quizDraft
        .map((q) => ({
          type: q.type,
          prompt: q.prompt.trim(),
          options: q.options
            .map((o) => ({ text: o.text.trim(), isCorrect: !!o.isCorrect }))
            .filter((o) => o.text.length > 0),
        }))
        .filter((q) => q.prompt.length > 0);

      if (!clean.length) throw new Error("Inclua pelo menos 1 pergunta.");
      for (const q of clean) {
        const correct = q.options.filter((o) => o.isCorrect).length;
        if (q.type === "TRUE_FALSE") {
          if (q.options.length !== 2) throw new Error("Verdadeiro/Falso exige exatamente 2 opções.");
          if (correct !== 1) throw new Error("Verdadeiro/Falso exige exatamente 1 opção correta.");
        } else {
          if (q.options.length < 2) throw new Error("Múltipla escolha exige pelo menos 2 opções.");
          if (correct !== 1) throw new Error("Marque exatamente 1 opção correta por pergunta.");
        }
      }

      await replaceQuiz(quizModuleId, { questions: clean });
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["quiz-editor", quizModuleId] });
      toast({ title: "Quiz atualizado" });
      setQuizOpen(false);
      setQuizModuleId(null);
    },
  });

  if (trackLoading) {
    return (
      <div className="rounded-3xl border bg-white p-6">
        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Carregando trilha…</div>
      </div>
    );
  }

  if (!track) {
    return (
      <div className="rounded-3xl border bg-white p-6">
        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Trilha não encontrada</div>
        <Button asChild variant="outline" className="mt-4 rounded-xl">
          <Link to={backPath}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar
          </Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="outline" className="rounded-xl">
          <Link to={backPath}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Trilhas de Conhecimento
          </Link>
        </Button>

        <Button
          className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
          disabled={!dirtyTrack || saveTrackMutation.isPending || title.trim().length < 6 || description.trim().length < 10}
          onClick={async () => {
            try {
              await saveTrackMutation.mutateAsync();
            } catch (e) {
              toast({
                title: "Não foi possível salvar",
                description: e instanceof Error ? e.message : "Erro inesperado.",
                variant: "destructive",
              });
            }
          }}
        >
          <Save className="mr-2 h-4 w-4" />
          Salvar
        </Button>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Configurações</div>
            <div className="mt-1 text-xl font-semibold text-[color:var(--sinaxys-ink)]">Editar trilha</div>
            <p className="mt-1 text-sm text-muted-foreground">Título, descrição e publicação.</p>
          </div>
          <Badge className={"rounded-full " + (published ? "bg-emerald-100 text-emerald-900 hover:bg-emerald-100" : "bg-amber-100 text-amber-900 hover:bg-amber-100")}>
            {published ? "Publicada" : "Rascunho"}
          </Badge>
        </div>

        <div className="mt-5 grid gap-4">
          <div className="grid gap-2">
            <Label>Título</Label>
            <Input className="h-11 rounded-xl" value={title} onChange={(e) => setTitle(e.target.value)} />
          </div>
          <div className="grid gap-2">
            <Label>Descrição</Label>
            <Textarea className="min-h-28 rounded-2xl" value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
            <div className="min-w-0">
              <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Publicar</div>
              <div className="mt-1 text-xs text-muted-foreground">Trilhas publicadas aparecem para colaboradores.</div>
            </div>
            <Switch checked={published} onCheckedChange={setPublished} />
          </div>
        </div>
      </Card>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-center">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Módulos</div>
            <p className="mt-1 text-sm text-muted-foreground">Ordem sequencial. O primeiro módulo fica disponível automaticamente.</p>
          </div>
          <Button
            className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
            onClick={() => {
              setEditingModuleId(null);
              setModuleOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo módulo
          </Button>
        </div>

        <Separator className="my-5" />

        {modsLoading ? (
          <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Carregando módulos…</div>
        ) : modules.length ? (
          <div className="grid gap-3">
            {modules.map((m, idx) => (
              <div key={m.id} className="rounded-2xl border border-[color:var(--sinaxys-border)] p-4">
                <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                        {typeIcon(m.type)}
                        {typeLabel(m.type) ? <span className="ml-2">{typeLabel(m.type)}</span> : null}
                      </Badge>
                      <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{m.title}</div>
                      <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white">+{m.xpReward} Pontos</Badge>
                    </div>
                    {m.description ? <div className="mt-2 text-sm text-muted-foreground">{m.description}</div> : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-xl"
                      disabled={idx === 0}
                      onClick={() => moveModule(m.id, -1)}
                      aria-label="Subir"
                    >
                      <ChevronUp className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-xl"
                      disabled={idx === modules.length - 1}
                      onClick={() => moveModule(m.id, 1)}
                      aria-label="Descer"
                    >
                      <ChevronDown className="h-4 w-4" />
                    </Button>

                    {m.type === "QUIZ" ? (
                      <Button
                        variant="outline"
                        className="h-9 rounded-xl"
                        onClick={() => {
                          setQuizModuleId(m.id);
                          setQuizOpen(true);
                        }}
                      >
                        <HelpCircle className="mr-2 h-4 w-4" />
                        Editar quiz
                      </Button>
                    ) : null}

                    <Button
                      variant="outline"
                      className="h-9 rounded-xl"
                      onClick={() => {
                        setEditingModuleId(m.id);
                        setModuleOpen(true);
                      }}
                    >
                      <Save className="mr-2 h-4 w-4" />
                      Editar
                    </Button>

                    <Button
                      variant="outline"
                      size="icon"
                      className="h-9 w-9 rounded-xl"
                      onClick={async () => {
                        try {
                          await deleteModuleMutation.mutateAsync(m.id);
                        } catch (e) {
                          toast({
                            title: "Não foi possível remover",
                            description: e instanceof Error ? e.message : "Erro inesperado.",
                            variant: "destructive",
                          });
                        }
                      }}
                      aria-label="Remover"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Nenhum módulo ainda.</div>
        )}
      </Card>

      {/* Module dialog */}
      <Dialog
        open={moduleOpen}
        onOpenChange={(v) => {
          setModuleOpen(v);
          if (!v) setEditingModuleId(null);
        }}
      >
        <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingModule ? "Editar módulo" : "Novo módulo"}</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="grid gap-2">
              <Label>Tipo</Label>
              <Select value={mType} onValueChange={(v) => setMType(v as any)}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VIDEO">Vídeo</SelectItem>
                  <SelectItem value="MATERIAL">Material (link)</SelectItem>
                  <SelectItem value="CHECKPOINT">Checkpoint</SelectItem>
                  <SelectItem value="QUIZ">Quiz</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label>Título</Label>
              <Input className="h-11 rounded-xl" value={mTitle} onChange={(e) => setMTitle(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label>Descrição (opcional)</Label>
              <Textarea className="min-h-24 rounded-2xl" value={mDesc} onChange={(e) => setMDesc(e.target.value)} />
            </div>

            <div className="grid gap-2">
              <Label>Pontos</Label>
              <Input className="h-11 rounded-xl" value={mXp} onChange={(e) => setMXp(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" />
            </div>

            {mType === "VIDEO" ? (
              <div className="grid gap-2">
                <Label>URL do vídeo</Label>
                <Input className="h-11 rounded-xl" value={mYoutube} onChange={(e) => setMYoutube(e.target.value)} placeholder="https://..." />
              </div>
            ) : null}

            {mType === "MATERIAL" ? (
              <div className="grid gap-2">
                <Label>URL do material</Label>
                <Input className="h-11 rounded-xl" value={mMaterial} onChange={(e) => setMMaterial(e.target.value)} placeholder="https://..." />
              </div>
            ) : null}

            {mType === "CHECKPOINT" ? (
              <div className="grid gap-2">
                <Label>Pergunta do checkpoint</Label>
                <Textarea className="min-h-24 rounded-2xl" value={mCheckpoint} onChange={(e) => setMCheckpoint(e.target.value)} />
              </div>
            ) : null}

            {mType === "QUIZ" ? (
              <div className="grid gap-2">
                <Label>Nota mínima (%)</Label>
                <Input className="h-11 rounded-xl" value={mMinScore} onChange={(e) => setMMinScore(e.target.value.replace(/[^0-9]/g, ""))} inputMode="numeric" />
                <div className="text-xs text-muted-foreground">Após salvar, use "Editar quiz" na lista para configurar perguntas.</div>
              </div>
            ) : null}
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="rounded-xl" onClick={() => setModuleOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={mTitle.trim().length < 3 || saveModuleMutation.isPending}
              onClick={async () => {
                try {
                  await saveModuleMutation.mutateAsync();
                } catch (e) {
                  toast({
                    title: "Não foi possível salvar",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                }
              }}
            >
              <Check className="mr-2 h-4 w-4" />
              Salvar módulo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Quiz dialog */}
      <Dialog
        open={quizOpen}
        onOpenChange={(v) => {
          setQuizOpen(v);
          if (!v) setQuizModuleId(null);
        }}
      >
        <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Editar quiz</DialogTitle>
          </DialogHeader>

          <div className="grid gap-4">
            <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
              Regras: cada pergunta deve ter exatamente 1 alternativa correta.
            </div>

            <div className="grid gap-3">
              {quizDraft.map((q, qi) => (
                <div key={qi} className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-white p-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                    <div className="grid gap-2 flex-1">
                      <Label>Pergunta {qi + 1}</Label>
                      <Input
                        className="h-11 rounded-xl"
                        value={q.prompt}
                        onChange={(e) =>
                          setQuizDraft((prev) => {
                            const copy = prev.slice();
                            copy[qi] = { ...copy[qi], prompt: e.target.value };
                            return copy;
                          })
                        }
                      />
                    </div>
                    <div className="grid gap-2 md:w-[240px]">
                      <Label>Tipo</Label>
                      <Select
                        value={q.type}
                        onValueChange={(v) =>
                          setQuizDraft((prev) => {
                            const copy = prev.slice();
                            const nextType = v as QuizQuestion["type"];
                            const baseOptions =
                              nextType === "TRUE_FALSE"
                                ? [
                                    { text: "Verdadeiro", isCorrect: true },
                                    { text: "Falso", isCorrect: false },
                                  ]
                                : [
                                    { text: "Opção A", isCorrect: true },
                                    { text: "Opção B", isCorrect: false },
                                  ];
                            copy[qi] = { ...copy[qi], type: nextType, options: baseOptions };
                            return copy;
                          })
                        }
                      >
                        <SelectTrigger className="h-11 rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="MULTIPLE_CHOICE">Múltipla escolha</SelectItem>
                          <SelectItem value="TRUE_FALSE">Verdadeiro/Falso</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Separator className="my-4" />

                  <div className="grid gap-2">
                    <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Alternativas</div>

                    {q.options.map((o, oi) => (
                      <div key={oi} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                        <Input
                          className="h-11 rounded-xl"
                          value={o.text}
                          onChange={(e) =>
                            setQuizDraft((prev) => {
                              const copy = prev.slice();
                              const qq = copy[qi];
                              const opts = qq.options.slice();
                              opts[oi] = { ...opts[oi], text: e.target.value };
                              copy[qi] = { ...qq, options: opts };
                              return copy;
                            })
                          }
                        />
                        <Button
                          type="button"
                          variant={o.isCorrect ? "default" : "outline"}
                          className={
                            "h-11 rounded-xl " +
                            (o.isCorrect ? "bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90" : "")
                          }
                          onClick={() =>
                            setQuizDraft((prev) => {
                              const copy = prev.slice();
                              const qq = copy[qi];
                              const opts = qq.options.map((x, idx) => ({ ...x, isCorrect: idx === oi }));
                              copy[qi] = { ...qq, options: opts };
                              return copy;
                            })
                          }
                        >
                          {o.isCorrect ? "Correta" : "Marcar correta"}
                        </Button>

                        {q.type === "MULTIPLE_CHOICE" ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-11 rounded-xl"
                            onClick={() =>
                              setQuizDraft((prev) => {
                                const copy = prev.slice();
                                const qq = copy[qi];
                                const opts = qq.options.slice();
                                opts.splice(oi, 1);
                                copy[qi] = { ...qq, options: opts.length ? opts : qq.options };
                                return copy;
                              })
                            }
                            disabled={q.options.length <= 2}
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Remover
                          </Button>
                        ) : null}
                      </div>
                    ))}

                    {q.type === "MULTIPLE_CHOICE" ? (
                      <Button
                        type="button"
                        variant="outline"
                        className="h-11 rounded-xl"
                        onClick={() =>
                          setQuizDraft((prev) => {
                            const copy = prev.slice();
                            const qq = copy[qi];
                            copy[qi] = { ...qq, options: [...qq.options, { text: "", isCorrect: false }] };
                            return copy;
                          })
                        }
                      >
                        <Plus className="mr-2 h-4 w-4" />
                        Adicionar alternativa
                      </Button>
                    ) : null}
                  </div>

                  <Separator className="my-4" />

                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-xl"
                    onClick={() => setQuizDraft((prev) => prev.filter((_, i) => i !== qi))}
                    disabled={quizDraft.length <= 1}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Remover pergunta
                  </Button>
                </div>
              ))}

              {!quizDraft.length ? (
                <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">Nenhuma pergunta ainda.</div>
              ) : null}

              <Button
                type="button"
                variant="outline"
                className="h-11 rounded-xl"
                onClick={() =>
                  setQuizDraft((prev) => [
                    ...prev,
                    {
                      type: "MULTIPLE_CHOICE",
                      prompt: "",
                      options: [
                        { text: "Opção A", isCorrect: true },
                        { text: "Opção B", isCorrect: false },
                      ],
                    },
                  ])
                }
              >
                <Plus className="mr-2 h-4 w-4" />
                Adicionar pergunta
              </Button>
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="rounded-xl" onClick={() => setQuizOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={saveQuizMutation.isPending}
              onClick={async () => {
                try {
                  await saveQuizMutation.mutateAsync();
                } catch (e) {
                  toast({
                    title: "Não foi possível salvar",
                    description: e instanceof Error ? e.message : "Erro inesperado.",
                    variant: "destructive",
                  });
                }
              }}
            >
              <Save className="mr-2 h-4 w-4" />
              Salvar quiz
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}