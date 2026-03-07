import { useState } from "react";
import { Plus, Search, Youtube, Check, ExternalLink, RefreshCcw } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { listMyTrailVideos, type DbTrailVideo } from "@/lib/trailVideosDb";
import { getMyYouTubeIntegration } from "@/lib/youtubeIntegrationDb";
import { PublishVideoForm } from "./PublishVideoForm";

interface TrailVideoSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (video: { youtubeUrl: string; youtubeVideoId: string; title: string }) => void;
}

function formatVideoDate(dateStr: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function TrailVideoSelector({ open, onOpenChange, onSelect }: TrailVideoSelectorProps) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user, activeCompanyId } = useAuth();
  const tenantId = activeCompanyId;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"library" | "upload">("library");

  const { data: integration } = useQuery({
    queryKey: ["youtube-integration", tenantId, user?.id],
    queryFn: () => {
      if (!tenantId || !user?.id) return null;
      return getMyYouTubeIntegration(tenantId, user.id);
    },
    enabled: open && !!tenantId && !!user?.id,
  });

  const connected = (integration?.status ?? "disconnected") === "connected";

  const { data: videos, isLoading, refetch } = useQuery({
    queryKey: ["trail-videos", tenantId, user?.id],
    queryFn: () => {
      if (!tenantId || !user?.id) return [];
      return listMyTrailVideos(tenantId, user.id);
    },
    enabled: open && !!tenantId && !!user?.id,
    retry: false,
  });

  const filteredVideos = videos?.filter(
    (video) =>
      video.status === "published" &&
      video.youtube_video_id &&
      video.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) ?? [];

  const handleSelect = () => {
    const selected = videos?.find((v) => v.id === selectedVideoId);
    if (selected && selected.youtube_video_id) {
      onSelect({
        youtubeUrl: `https://www.youtube.com/watch?v=${selected.youtube_video_id}`,
        youtubeVideoId: selected.youtube_video_id,
        title: selected.title,
      });
      onOpenChange(false);
      setSelectedVideoId(null);
      setSearchQuery("");
      setActiveTab("library");
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] max-w-[92vw] overflow-y-auto rounded-3xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Selecionar vídeo do YouTube</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="library">
              <Youtube className="mr-2 h-4 w-4" />
              Biblioteca
            </TabsTrigger>
            <TabsTrigger value="upload">
              <Plus className="mr-2 h-4 w-4" />
              Novo vídeo
            </TabsTrigger>
          </TabsList>

          <TabsContent value="library" className="space-y-4">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Buscar vídeos..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="rounded-2xl pl-10"
                />
              </div>
              <Button
                variant="secondary"
                size="icon"
                className="rounded-xl"
                onClick={() => refetch()}
              >
                <RefreshCcw className="h-4 w-4" />
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] p-4">
                    <Skeleton className="h-10 w-10 rounded-xl" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-3/4 rounded-lg" />
                      <Skeleton className="h-3 w-1/2 rounded-lg" />
                    </div>
                  </div>
                ))}
              </div>
            ) : filteredVideos.length === 0 ? (
              <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] p-8 text-center">
                <Youtube className="mx-auto h-12 w-12 text-muted-foreground" />
                <p className="mt-3 text-sm text-muted-foreground">
                  {searchQuery
                    ? "Nenhum vídeo encontrado com este termo."
                    : "Nenhum vídeo publicado ainda."}
                </p>
                {videos && videos.length > 0 && videos.every((v) => v.status !== "published") && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Você tem {videos.length} vídeo(s), mas nenhum está publicado no YouTube ainda.
                  </p>
                )}
              </div>
            ) : (
              <ScrollArea className="h-[400px] pr-4">
                <div className="space-y-2">
                  {filteredVideos.map((video) => (
                    <button
                      key={video.id}
                      type="button"
                      onClick={() => setSelectedVideoId(video.id)}
                      className={`w-full flex items-start gap-3 rounded-2xl border p-4 text-left transition-all ${
                        selectedVideoId === video.id
                          ? "border-[color:var(--sinaxys-primary)] bg-[color:var(--sinaxys-primary)]/10"
                          : "border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] hover:border-[color:var(--sinaxys-border)]/80"
                      }`}
                    >
                      <div className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-red-500/15 ring-1 ring-red-500/20">
                        <Youtube className="h-5 w-5 text-red-300" />
                      </div>
                      <div className="flex min-w-0 flex-1 flex-col gap-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="truncate text-sm font-medium text-[color:var(--sinaxys-ink)]">
                            {video.title}
                          </div>
                          {selectedVideoId === video.id && (
                            <Check className="h-4 w-4 shrink-0 text-[color:var(--sinaxys-primary)]" />
                          )}
                        </div>
                        <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                          <span>{formatVideoDate(video.created_at)}</span>
                          {video.youtube_video_id && (
                            <a
                              href={`https://www.youtube.com/watch?v=${video.youtube_video_id}`}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1 hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" />
                              Abrir no YouTube
                            </a>
                          )}
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                variant="secondary"
                className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-transparent text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-border)]/30"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button
                className="rounded-2xl bg-[color:var(--sinaxys-primary)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-primary)]/90"
                onClick={handleSelect}
                disabled={!selectedVideoId}
              >
                Selecionar vídeo
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <PublishVideoForm connected={connected} />
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
