import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  ArrowLeft,
  Plus,
  MoveUp,
  MoveDown,
  Trash2,
  PlayCircle,
  ClipboardCheck,
  HelpCircle,
  BookOpenText,
  Pencil,
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
import type { TrackModule } from "@/lib/domain";
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

export default function HeadTrackEdit() {
  const { user } = useAuth();
  const { trackId } = useParams();
  const [, force] = useState(0);

  const track = useMemo(() => (trackId ? mockDb.getTrack(trackId) : null), [trackId]);
  const modules = useMemo(() => (trackId ? mockDb.getModulesByTrack(trackId) : []), [trackId, force]);

  const [open, setOpen] = useState(false);
  const [moduleType, setModuleType] = useState<TrackModule["type"]>("VIDEO");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [youtubeUrl, setYoutubeUrl] = useState("");
  const [materialUrl, setMaterialUrl] = useState("");
  const [minScore, setMinScore] = useState("70");
  const [checkpointPrompt, setCheckpointPrompt] = useState("");
  const [tfPrompt, setTfPrompt] = useState("");
  const [tfCorrect, setTfCorrect] = useState<"true" | "false">("true");

  // Edit existing module (needed to update reading material links over time)
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

  const move = (id: string, dir: -1 | 1) => {
    const ordered = modules.slice().sort((a, b) => a.orderIndex - b.orderIndex);
    const idx = ordered.findIndex((m) => m.id === id);
    const swapIdx = idx + dir;
    if (idx < 0 || swapIdx < 0 || swapIdx >= ordered.length) return;

    const a = ordered[idx];
    const b = ordered[swapIdx];
    const aOrder = a.orderIndex;
    a.orderIndex = b.orderIndex;
    b.orderIndex = aOrder;

    mockDb.upsertModule(a);
    mockDb.upsertModule(b);
    force((x) => x + 1);
  };

  const resetDialog = () => {
    setModuleType("VIDEO");
    setTitle("");
    setDescription("");
    setYoutubeUrl("");
    setMaterialUrl("");
    setMinScore("70");
    setCheckpointPrompt("");
    setTfPrompt("");
    setTfCorrect("true");
  };

  const openEdit = (m: TrackModule) => {
    setEditModuleId(m.id);
    setEditTitle(m.title);
    setEditDescription(m.description ?? "");
    setEditYoutubeUrl(m.youtubeUrl ?? "");
    setEditMaterialUrl(m.materialUrl ?? "");
    setEditCheckpointPrompt(m.checkpointPrompt ?? "");
    setEditMinScore(String(m.minScore ?? 70));
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

    mockDb.upsertModule(updated);
    setEditOpen(false);
    force((x) => x + 1);
  };

  const isEditValid = (() => {
    if (!editModule) return false;
    if (editTitle.trim().length < 4) return false;
    if (editModule.type === "VIDEO" && editYoutubeUrl.trim().length < 10) return false;
    if (editModule.type === "MATERIAL" && editMaterialUrl.trim().length < 10) return false;
    if (editModule.type === "CHECKPOINT" && editCheckpointPrompt.trim().length < 10) return false;
    if (editModule.type === "QUIZ" && !editMinScore.trim()) return false;
    return true;
  })();

  const nextOrder = (modules.reduce((max, m) => Math.max(max, m.orderIndex), 0) || 0) + 1;

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
        <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-xl">
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
                  Atualize o link do material sempre que necessário — sem recriar a trilha.
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
                  <Label>Link do material (Figma)</Label>
                  <Input
                    value={editMaterialUrl}
                    onChange={(e) => setEditMaterialUrl(e.target.value)}
                    className="rounded-xl"
                    placeholder="https://www.figma.com/..."
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
                <div className="grid gap-2">
                  <Label>Nota mínima (%)</Label>
                  <Input
                    value={editMinScore}
                    onChange={(e) => setEditMinScore(e.target.value)}
                    className="rounded-xl"
                    inputMode="numeric"
                  />
                  <div className="text-xs text-muted-foreground">
                    No MVP, o editor do quiz é intencionalmente simples. A pergunta pode ser ajustada na próxima iteração.
                  </div>
                </div>
              ) : null}
            </div>
          </ScrollArea>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button
              variant="outline"
              className="w-full rounded-xl sm:w-auto"
              onClick={() => setEditOpen(false)}
            >
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

      <div className="flex flex-col justify-between gap-3 rounded-3xl border bg-white p-6 md:flex-row md:items-center">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Editor de trilha</div>
          <div className="mt-1 truncate text-xl font-semibold text-[color:var(--sinaxys-ink)]">{track.title}</div>
          <div className="mt-1 text-sm text-muted-foreground">{track.description}</div>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
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
            <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-xl">
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
                        <SelectItem value="MATERIAL">Material (Figma)</SelectItem>
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
                      <Label>Link do material (Figma)</Label>
                      <Input
                        value={materialUrl}
                        onChange={(e) => setMaterialUrl(e.target.value)}
                        className="rounded-xl"
                        placeholder="https://www.figma.com/..."
                      />
                      <div className="text-xs text-muted-foreground">
                        Dica: use o link de compartilhamento da apresentação. Ao trocar o link, o material é atualizado sem precisar recriar a trilha.
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
                    <div className="grid gap-3">
                      <div className="grid gap-2">
                        <Label>Nota mínima (%)</Label>
                        <Input value={minScore} onChange={(e) => setMinScore(e.target.value)} className="rounded-xl" inputMode="numeric" />
                      </div>
                      <Separator />
                      <div className="text-sm font-medium text-[color:var(--sinaxys-ink)]">Pergunta (V/F) — MVP</div>
                      <div className="grid gap-2">
                        <Label>Enunciado</Label>
                        <Textarea value={tfPrompt} onChange={(e) => setTfPrompt(e.target.value)} className="min-h-20 rounded-2xl" />
                      </div>
                      <div className="grid gap-2">
                        <Label>Resposta correta</Label>
                        <Select value={tfCorrect} onValueChange={(v) => setTfCorrect(v as "true" | "false") }>
                          <SelectTrigger className="rounded-xl">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true">Verdadeiro</SelectItem>
                            <SelectItem value="false">Falso</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  ) : null}
                </div>
              </ScrollArea>

              <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                <Button
                  className="w-full rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90 sm:w-auto"
                  disabled={
                    title.trim().length < 4 ||
                    (moduleType === "VIDEO" && youtubeUrl.trim().length < 10) ||
                    (moduleType === "MATERIAL" && materialUrl.trim().length < 10) ||
                    (moduleType === "CHECKPOINT" && checkpointPrompt.trim().length < 10) ||
                    (moduleType === "QUIZ" && (tfPrompt.trim().length < 8 || !minScore.trim()))
                  }
                  onClick={() => {
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
                        questions: [
                          {
                            type: "TRUE_FALSE",
                            prompt: tfPrompt.trim(),
                            options: [
                              { text: "Verdadeiro", isCorrect: tfCorrect === "true" },
                              { text: "Falso", isCorrect: tfCorrect === "false" },
                            ],
                          },
                        ],
                      });
                    }

                    setOpen(false);
                    resetDialog();
                    force((x) => x + 1);
                  }}
                >
                  Adicionar
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Módulos</div>
        <p className="mt-1 text-sm text-muted-foreground">A sequência é obrigatória: a ordem define o desbloqueio.</p>

        <div className="mt-4 grid gap-3">
          {modules.length ? (
            modules
              .slice()
              .sort((a, b) => a.orderIndex - b.orderIndex)
              .map((m, idx) => (
                <div key={m.id} className="rounded-2xl border border-[color:var(--sinaxys-border)] p-4">
                  <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
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
                        disabled={idx === 0}
                        onClick={() => move(m.id, -1)}
                        aria-label="Mover para cima"
                      >
                        <MoveUp className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-xl"
                        disabled={idx === modules.length - 1}
                        onClick={() => move(m.id, 1)}
                        aria-label="Mover para baixo"
                      >
                        <MoveDown className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        className="rounded-xl"
                        onClick={() => {
                          mockDb.deleteModule(m.id);
                          force((x) => x + 1);
                        }}
                        aria-label="Remover módulo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))
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