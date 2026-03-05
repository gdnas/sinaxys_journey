import { useState } from "react";
import { Search, Video, Calendar, Clock, Check } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { listTeamsVideos, TeamsVideo } from "@/lib/teamsIntegrationDb";

interface TeamsVideoSelectorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (video: TeamsVideo) => void;
}

function formatDuration(minutes: number | null): string {
  if (!minutes) return "--";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "--";
  const date = new Date(dateStr);
  return date.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function TeamsVideoSelector({ open, onOpenChange, onSelect }: TeamsVideoSelectorProps) {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedVideoId, setSelectedVideoId] = useState<string | null>(null);

  const { data: videos, isLoading, error } = useQuery({
    queryKey: ["teams-videos"],
    queryFn: () => listTeamsVideos(),
    enabled: open,
    retry: false,
  });

  const filteredVideos = videos?.filter((video) =>
    video.title.toLowerCase().includes(searchQuery.toLowerCase())
  ) ?? [];

  const handleSelect = () => {
    const selected = videos?.find((v) => v.id === selectedVideoId);
    if (selected) {
      onSelect(selected);
      onOpenChange(false);
      setSelectedVideoId(null);
      setSearchQuery("");
    }
  };

  if (error) {
    toast({
      title: "Erro ao carregar vídeos",
      description: "Não foi possível listar as reuniões do Teams. Verifique se a integração está ativa.",
      variant: "destructive",
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Selecionar vídeo do Microsoft Teams</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar reuniões..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-2xl pl-10"
            />
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
              <Video className="mx-auto h-12 w-12 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                {searchQuery
                  ? "Nenhuma reunião encontrada com este termo."
                  : "Nenhuma reunião gravada encontrada no Teams."}
              </p>
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
                    <div className="mt-1 grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-indigo-500/15 ring-1 ring-indigo-500/20">
                      <Video className="h-5 w-5 text-indigo-300" />
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
                        <div className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {formatDate(video.date)}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatDuration(video.duration)}
                        </div>
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
        </div>
      </DialogContent>
    </Dialog>
  );
}