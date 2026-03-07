import { useEffect, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { RefreshCcw, Video } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { getMyYouTubeIntegration } from "@/lib/youtubeIntegrationDb";
import { finalizeUpload, listMyTrailVideos } from "@/lib/trailVideosDb";
import { YouTubeIntegrationCard } from "@/components/videos/YouTubeIntegrationCard";
import { PublishVideoForm } from "@/components/videos/PublishVideoForm";

function statusBadge(status: string) {
  if (status === "published") return <Badge className="rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25">Publicado</Badge>;
  if (status === "processing") return <Badge className="rounded-full bg-indigo-500/15 text-indigo-200 ring-1 ring-indigo-500/25">Processando</Badge>;
  if (status === "uploading") return <Badge className="rounded-full bg-sky-500/15 text-sky-200 ring-1 ring-sky-500/25">Enviando</Badge>;
  if (status === "error") return <Badge className="rounded-full bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/25">Falhou</Badge>;
  return <Badge className="rounded-full bg-[color:var(--sinaxys-border)]/70 text-[color:var(--sinaxys-ink)]">Rascunho</Badge>;
}

export default function TrailVideos() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user, activeCompanyId } = useAuth();
  const { search } = useLocation();

  const tenantId = activeCompanyId;

  useEffect(() => {
    const sp = new URLSearchParams(search);
    const yt = sp.get("yt");
    const reason = sp.get("reason");

    if (yt === "connected") {
      toast({ title: "YouTube conectado" });
      void qc.invalidateQueries({ queryKey: ["youtube-integration"] });
    }

    if (yt === "error") {
      toast({
        title: "Falha ao conectar YouTube",
        description: reason ? decodeURIComponent(reason) : "Tente novamente.",
        variant: "destructive",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  if (!user || !tenantId) return null;

  const { data: integration } = useQuery({
    queryKey: ["youtube-integration", tenantId, user.id],
    queryFn: () => getMyYouTubeIntegration(tenantId, user.id),
  });

  const connected = (integration?.status ?? "disconnected") === "connected";

  const { data: uploads = [], refetch } = useQuery({
    queryKey: ["trail-videos", tenantId, user.id],
    queryFn: () => listMyTrailVideos(tenantId, user.id),
    refetchInterval: (query) => {
      const rows = (query.state.data as any[] | undefined) ?? [];
      return rows.some((r) => r.status === "processing") ? 15_000 : false;
    },
  });

  const recent = useMemo(() => uploads.slice(0, 8), [uploads]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6 sm:px-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Trilhas</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[color:var(--sinaxys-ink)] sm:text-3xl">Vídeos de Trilhas</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Publique vídeos diretamente no YouTube (upload do seu navegador → YouTube), sem armazenar arquivo na Kairoos.
          </p>
        </div>

        <Button
          variant="secondary"
          onClick={() => refetch()}
          className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-transparent text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-border)]/30"
        >
          <RefreshCcw className="mr-2 h-4 w-4" />
          Atualizar
        </Button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <YouTubeIntegrationCard tenantId={tenantId} userId={user.id} />
        <PublishVideoForm connected={connected} />
      </div>

      <div className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Publicações recentes</div>
            <div className="mt-1 text-sm text-muted-foreground">Status e links dos últimos envios.</div>
          </div>
        </div>

        <Card className="mt-3 rounded-3xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] p-5">
          {recent.length === 0 ? (
            <div className="rounded-2xl bg-[color:var(--sinaxys-bg)]/20 p-4 text-sm text-muted-foreground">
              Nenhum vídeo publicado ainda.
            </div>
          ) : (
            <div className="grid gap-3">
              {recent.map((r) => (
                <div key={r.id} className="rounded-2xl border border-[color:var(--sinaxys-border)]/70 bg-[color:var(--sinaxys-bg)]/15 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <div className="grid h-8 w-8 place-items-center rounded-xl bg-[color:var(--sinaxys-border)]/30">
                          <Video className="h-4 w-4 text-[color:var(--sinaxys-ink)]/80" />
                        </div>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-[color:var(--sinaxys-ink)]">{r.title}</div>
                          <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                            <span className="rounded-full bg-[color:var(--sinaxys-border)]/30 px-2.5 py-1">{r.privacy}</span>
                            {r.file_name ? <span className="truncate rounded-full bg-[color:var(--sinaxys-border)]/30 px-2.5 py-1">{r.file_name}</span> : null}
                          </div>
                        </div>
                      </div>

                      {r.youtube_video_id ? (
                        <div className="mt-2 text-xs text-muted-foreground">
                          videoId: <span className="font-medium text-[color:var(--sinaxys-ink)]">{r.youtube_video_id}</span>
                        </div>
                      ) : null}

                      {r.error_message ? (
                        <div className="mt-2 text-xs text-rose-200">Erro: {r.error_message}</div>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 flex-col items-end gap-2">
                      {statusBadge(r.status)}

                      {r.youtube_video_id ? (
                        <a
                          href={`https://www.youtube.com/watch?v=${encodeURIComponent(r.youtube_video_id)}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-xs font-medium text-[color:var(--sinaxys-primary)] hover:underline"
                        >
                          Abrir
                        </a>
                      ) : null}

                      {r.status === "processing" ? (
                        <Button
                          size="sm"
                          variant="secondary"
                          className="rounded-xl border border-[color:var(--sinaxys-border)] bg-transparent text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-border)]/30"
                          onClick={async () => {
                            try {
                              await finalizeUpload({ trailVideoId: r.id, youtubeVideoId: r.youtube_video_id ?? undefined });
                              await qc.invalidateQueries({ queryKey: ["trail-videos", tenantId, user.id] });
                            } catch (e: any) {
                              toast({
                                title: "Não foi possível atualizar status",
                                description: String(e?.message ?? "Tente novamente."),
                                variant: "destructive",
                              });
                            }
                          }}
                        >
                          Checar
                        </Button>
                      ) : null}
                    </div>
                  </div>

                  <Separator className="my-3 bg-[color:var(--sinaxys-border)]/70" />

                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-muted-foreground">
                    <span>ID: {r.id}</span>
                    <span>{new Date(r.created_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
