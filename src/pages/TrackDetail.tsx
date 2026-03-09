import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, CheckCircle2, FileText, PlayCircle, Rocket, Settings2, SquarePen, Trophy } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ResourceEmbed } from "@/components/ResourceEmbed";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { listDepartments } from "@/lib/departmentsDb";
import {
  assignTrack,
  getLatestAssignmentForUserAndTrack,
  getModulesByTrack,
  getTrack,
  setTrackDepartment,
  type DbModule,
} from "@/lib/journeyDb";
import { formatShortDate, getYouTubeEmbedUrl } from "@/lib/sinaxys";

function toDateInputValue(iso?: string | null) {
  if (!iso) return "";
  const d = new Date(iso);
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

function toDueIso(dateInput: string) {
  const d = new Date(`${dateInput}T23:59:59`);
  return d.toISOString();
}

function moduleTypeLabel(t: DbModule["type"]) {
  switch (t) {
    case "VIDEO":
      return "Vídeo";
    case "MATERIAL":
      return "Material";
    case "CHECKPOINT":
      return "Checkpoint";
    case "QUIZ":
      return "Quiz";
  }
}

function moduleTypeIcon(t: DbModule["type"]) {
  switch (t) {
    case "VIDEO":
      return <PlayCircle className="h-4 w-4" />;
    case "MATERIAL":
      return <FileText className="h-4 w-4" />;
    case "CHECKPOINT":
      return <SquarePen className="h-4 w-4" />;
    case "QUIZ":
      return <CheckCircle2 className="h-4 w-4" />;
  }
}

export default function TrackDetail() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const navigate = useNavigate();
  const params = useParams();
  const trackId = params.trackId ?? "";

  const [dueDate, setDueDate] = useState<string>("");
  const [starting, setStarting] = useState(false);

  // Admin: change responsible department
  const canChangeDept = user?.role === "ADMIN";
  const [deptOpen, setDeptOpen] = useState(false);
  const [deptSaving, setDeptSaving] = useState(false);
  const [deptNextId, setDeptNextId] = useState<string>("");

  if (!user) return null;
  if (!user.companyId) return null;

  const companyId = user.companyId;

  const { data: track, isLoading: loadingTrack } = useQuery({
    queryKey: ["track", trackId],
    queryFn: () => getTrack(trackId),
    enabled: !!trackId,
  });

  // Permission: who can edit this track?
  const canEdit = useMemo(() => {
    if (!track) return false;
    if (user.role === "ADMIN") return true;
    if (user.role === "HEAD") return user.departmentId && track.department_id === user.departmentId;
    if (user.role === "COLABORADOR") return track.created_by_user_id === user.id;
    return false;
  }, [user, track]);

  const { data: modules = [], isLoading: loadingModules } = useQuery({
    queryKey: ["modules", trackId],
    queryFn: () => getModulesByTrack(trackId),
    enabled: !!trackId,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["departments", companyId],
    queryFn: () => listDepartments(companyId),
  });

  const deptName = useMemo(() => {
    if (!track?.department_id) return null;
    return departments.find((d) => d.id === track.department_id)?.name ?? null;
  }, [departments, track?.department_id]);

  const { data: latestAssignment } = useQuery({
    queryKey: ["my-latest-assignment", user.id, trackId],
    queryFn: () => getLatestAssignmentForUserAndTrack({ userId: user.id, trackId }),
    enabled: !!trackId,
  });

  const canStart = useMemo(() => {
    if (!track) return false;
    if (user.role === "COLABORADOR" && !track.published) return false;
    return true;
  }, [track, user.role]);

  const cta = useMemo(() => {
    if (!latestAssignment) return { label: "Adicionar à minha jornada", mode: "start" as const };
    if (latestAssignment.status === "COMPLETED") return { label: "Refazer (nova atribuição)", mode: "restart" as const };
    return { label: "Continuar na minha jornada", mode: "continue" as const };
  }, [latestAssignment]);

  const dueAtIso = useMemo(() => {
    if (!dueDate.trim()) return null;
    return toDueIso(dueDate);
  }, [dueDate]);

  return (
    <div className="grid gap-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Button asChild variant="outline" className="rounded-xl">
          <Link to="/tracks">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Voltar para biblioteca
          </Link>
        </Button>

        <div className="flex items-center gap-2">
          {canChangeDept && track ? (
            <Button
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                setDeptNextId(track.department_id);
                setDeptOpen(true);
              }}
            >
              <Settings2 className="mr-2 h-4 w-4" />
              Equipe responsável
            </Button>
          ) : null}

          {canEdit && track ? (
            <Button
              asChild
              variant="outline"
              className="rounded-xl"
              onClick={() => {
                // navigate to appropriate edit route
                if (user.role === "ADMIN") {
                  navigate(`/admin/tracks/${track.id}/edit`);
                } else {
                  navigate(`/tracks/${track.id}/edit`);
                }
              }}
            >
              <span>
                <SquarePen className="mr-2 h-4 w-4" />
                Editar trilha
              </span>
            </Button>
          ) : null}
        </div>
      </div>

      <div className="rounded-3xl border bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Trilha</div>
            <div className="mt-1 truncate text-xl font-semibold text-[color:var(--sinaxys-ink)]">{track?.title ?? (loadingTrack ? "Carregando…" : "Não encontrada")}</div>
            {track?.description ? <p className="mt-2 text-sm text-muted-foreground">{track.description}</p> : null}

            <div className="mt-3 flex flex-wrap gap-2">
              {deptName ? (
                <Badge className="rounded-full bg-white text-[color:var(--sinaxys-ink)] hover:bg-white ring-1 ring-[color:var(--sinaxys-border)]">
                  {deptName}
                </Badge>
              ) : null}
              {track ? (
                track.published ? (
                  <Badge className="rounded-full bg-emerald-100 text-emerald-900 hover:bg-emerald-100">Publicada</Badge>
                ) : (
                  <Badge className="rounded-full bg-amber-100 text-amber-900 hover:bg-amber-100">Rascunho</Badge>
                )
              ) : null}
              {track?.created_at ? (
                <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                  Criada em {formatShortDate(track.created_at)}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-tint)]">
            <Rocket className="h-5 w-5 text-[color:var(--sinaxys-primary)]" />
          </div>
        </div>
      </div>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex flex-col justify-between gap-3 md:flex-row md:items-start">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Sua ação</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Você pode entrar nessa trilha mesmo que seja de outro departamento. Se já tiver uma atribuição, você continua do ponto onde parou.
            </p>
          </div>

          <div className="flex w-full flex-col gap-2 md:w-auto md:items-end">
            <div className="relative w-full md:w-[260px]">
              <CalendarClock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="h-11 w-full rounded-xl pl-9"
                placeholder="Prazo (opcional)"
              />
            </div>
            <div className="flex flex-wrap items-center justify-end gap-2">
              {[
                { label: "+7d", days: 7 },
                { label: "+14d", days: 14 },
                { label: "+30d", days: 30 },
              ].map((p) => (
                <Button
                  key={p.label}
                  variant="outline"
                  className="h-9 rounded-full"
                  onClick={() => {
                    const d = new Date();
                    d.setDate(d.getDate() + p.days);
                    setDueDate(toDateInputValue(d.toISOString()));
                  }}
                >
                  {p.label}
                </Button>
              ))}
              <Button
                className="h-11 rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
                disabled={!track || !canStart || starting}
                onClick={async () => {
                  if (!track) return;
                  try {
                    if (cta.mode === "continue" && latestAssignment?.id) {
                      navigate(`/app/tracks/${latestAssignment.id}`);
                      return;
                    }

                    setStarting(true);
                    const a = await assignTrack({
                      companyId,
                      trackId: track.id,
                      userId: user.id,
                      assignedByUserId: user.id,
                      dueAt: dueAtIso ?? undefined,
                    });

                    toast({
                      title: "Trilha adicionada",
                      description: "Ela já está na sua jornada. Vamos nessa.",
                    });
                    navigate(`/app/tracks/${a.id}`);
                  } catch (e) {
                    toast({
                      title: "Não foi possível iniciar",
                      description: e instanceof Error ? e.message : "Tente novamente.",
                      variant: "destructive",
                    });
                  } finally {
                    setStarting(false);
                  }
                }}
              >
                {cta.label}
              </Button>
            </div>

            {!canStart && user.role === "COLABORADOR" ? (
              <div className="text-xs text-muted-foreground">Essa trilha ainda está em rascunho, então não aparece para colaboradores.</div>
            ) : null}
          </div>
        </div>

        {latestAssignment ? (
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-2 rounded-full bg-[color:var(--sinaxys-tint)] px-3 py-1 font-semibold text-[color:var(--sinaxys-ink)]">
              {latestAssignment.status === "COMPLETED" ? <Trophy className="h-4 w-4" /> : <PlayCircle className="h-4 w-4" />}
              Status: {latestAssignment.status}
            </span>
            {latestAssignment.due_at ? (
              <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 font-semibold text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]">
                Prazo: {toDateInputValue(latestAssignment.due_at)}
              </span>
            ) : null}
          </div>
        ) : null}
      </Card>

      <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-white p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Conteúdo da trilha</div>
            <p className="mt-1 text-sm text-muted-foreground">
              {loadingModules ? "Carregando módulos…" : `${modules.length} módulo(s). Abra para visualizar o formato e os recursos.`}
            </p>
          </div>
        </div>

        <Separator className="my-5" />

        {modules.length ? (
          <Accordion type="multiple" className="w-full">
            {modules
              .slice()
              .sort((a, b) => a.order_index - b.order_index)
              .map((m) => (
                <AccordionItem key={m.id} value={m.id} className="border-none">
                  <AccordionTrigger className="rounded-2xl px-3 text-left hover:no-underline data-[state=open]:bg-[color:var(--sinaxys-tint)]">
                    <div className="flex w-full items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-1 text-xs font-semibold text-[color:var(--sinaxys-ink)] ring-1 ring-[color:var(--sinaxys-border)]">
                            {moduleTypeIcon(m.type)}
                            {moduleTypeLabel(m.type)}
                          </span>
                          <span className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">
                            {m.order_index}. {m.title}
                          </span>
                        </div>
                        {m.description ? <div className="mt-1 truncate text-xs text-muted-foreground">{m.description}</div> : null}
                        <div className="text-right">
                          <div className="text-xs text-muted-foreground">Recompensa</div>
                          <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">+{m.xp_reward} Pontos</div>
                        </div>
                      </div>

                      <Badge className="rounded-full bg-[color:var(--sinaxys-tint)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-tint)]">
                        +{m.xp_reward} Pontos
                      </Badge>
                    </div>
                  </AccordionTrigger>

                  <AccordionContent className="pt-4">
                    {m.type === "VIDEO" ? (
                      <div className="grid gap-3">
                        {(() => {
                          const originalUrl = m.youtube_url ?? m.material_url ?? "";
                          const embedUrl = getYouTubeEmbedUrl(originalUrl ?? "");

                          if (embedUrl) {
                            return (
                              <div className="overflow-hidden rounded-2xl border">
                                <iframe
                                  title={m.title}
                                  src={embedUrl}
                                  className="aspect-video w-full"
                                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                                  allowFullScreen
                                />
                              </div>
                            );
                          }

                          return (
                            <div className="flex items-center justify-center rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] p-6">
                              <Button asChild className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90">
                                <a href={originalUrl} target="_blank" rel="noreferrer">Ir para o vídeo</a>
                              </Button>
                            </div>
                          );
                        })()}
                      </div>
                    ) : null}

                    {m.type === "MATERIAL" ? (
                      <div className="grid gap-3">
                        <ResourceEmbed url={m.material_url ?? ""} title={m.title} />
                      </div>
                    ) : null}

                    {m.type === "CHECKPOINT" ? (
                      <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] p-4">
                        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Pergunta</div>
                        <div className="mt-1 text-sm text-muted-foreground">{m.checkpoint_prompt || "—"}</div>
                      </div>
                    ) : null}

                    {m.type === "QUIZ" ? (
                      <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] p-4">
                        <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Quiz</div>
                        <div className="mt-1 text-sm text-muted-foreground">Nota mínima: {m.min_score ?? 70}%.</div>
                      </div>
                    ) : null}
                  </AccordionContent>
                </AccordionItem>
              ))}
          </Accordion>
        ) : (
          <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
            {loadingTrack ? "Carregando…" : "Nenhum módulo cadastrado ainda."}
          </div>
        )}
      </Card>

      <Dialog
        open={deptOpen}
        onOpenChange={(v) => {
          setDeptOpen(v);
          if (!v) setDeptNextId("");
        }}
      >
        <DialogContent className="max-h-[88vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Equipe responsável pela trilha</DialogTitle>
          </DialogHeader>

          <div className="grid gap-3">
            <div className="rounded-2xl bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
              Alterar a equipe responsável muda o <span className="font-semibold">departamento</span> da trilha na biblioteca.
            </div>

            <div className="grid gap-2">
              <Label>Departamento</Label>
              <Select value={deptNextId} onValueChange={setDeptNextId}>
                <SelectTrigger className="h-11 rounded-xl">
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((d) => (
                    <SelectItem key={d.id} value={d.id}>
                      {d.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <Button variant="outline" className="rounded-xl" onClick={() => setDeptOpen(false)}>
              Cancelar
            </Button>
            <Button
              className="rounded-xl bg-[color:var(--sinaxys-primary)] text-white hover:bg-[color:var(--sinaxys-primary)]/90"
              disabled={!track || !deptNextId || deptSaving || deptNextId === track?.department_id}
              onClick={async () => {
                if (!track) return;
                try {
                  setDeptSaving(true);
                  await setTrackDepartment(track.id, deptNextId);
                  await Promise.all([
                    qc.invalidateQueries({ queryKey: ["track", trackId] }),
                    qc.invalidateQueries({ queryKey: ["tracks", companyId] }),
                  ]);
                  toast({ title: "Equipe responsável atualizada" });
                  setDeptOpen(false);
                } catch (e) {
                  toast({
                    title: "Não foi possível atualizar",
                    description: e instanceof Error ? e.message : "Tente novamente.",
                    variant: "destructive",
                  });
                } finally {
                  setDeptSaving(false);
                }
              }}
            >
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}