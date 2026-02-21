import { useMemo } from "react";
import { Link2, LogOut, Youtube } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { startYouTubeConnect, disconnectYouTube, getMyYouTubeIntegration } from "@/lib/youtubeIntegrationDb";

export function YouTubeIntegrationCard({ tenantId, userId }: { tenantId: string; userId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const { data: integration, isLoading } = useQuery({
    queryKey: ["youtube-integration", tenantId, userId],
    queryFn: () => getMyYouTubeIntegration(tenantId, userId),
  });

  const status = integration?.status ?? "disconnected";
  const connected = status === "connected";

  const badge = useMemo(() => {
    if (isLoading) return <Badge className="rounded-full bg-[color:var(--sinaxys-border)] text-[color:var(--sinaxys-ink)]">Carregando…</Badge>;
    if (connected)
      return <Badge className="rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25">Conectado</Badge>;
    if (status === "revoked")
      return <Badge className="rounded-full bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/25">Revogado</Badge>;
    return <Badge className="rounded-full bg-[color:var(--sinaxys-border)]/70 text-[color:var(--sinaxys-ink)]">Não conectado</Badge>;
  }, [connected, isLoading, status]);

  const connectMutation = useMutation({
    mutationFn: async () => {
      const { authUrl } = await startYouTubeConnect("/videos");
      window.location.href = authUrl;
    },
    onError: (e: any) => {
      toast({
        title: "Falha ao conectar",
        description: String(e?.message ?? "Tente novamente."),
        variant: "destructive",
      });
    },
  });

  const disconnectMutation = useMutation({
    mutationFn: async () => {
      await disconnectYouTube();
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["youtube-integration", tenantId, userId] });
      toast({ title: "YouTube desconectado" });
    },
    onError: (e: any) => {
      toast({
        title: "Não foi possível desconectar",
        description: String(e?.message ?? "Tente novamente."),
        variant: "destructive",
      });
    },
  });

  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="grid h-11 w-11 place-items-center rounded-2xl bg-red-500/15 ring-1 ring-red-500/20">
            <Youtube className="h-5 w-5 text-red-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <div className="text-sm font-semibold tracking-tight text-[color:var(--sinaxys-ink)]">YouTube</div>
              {badge}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Conecte para publicar vídeos direto no seu canal (upload do seu navegador → YouTube).
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!connected ? (
            <Button
              className="rounded-2xl bg-[color:var(--sinaxys-primary)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-primary)]/90"
              onClick={() => connectMutation.mutate()}
              disabled={connectMutation.isPending}
            >
              <Link2 className="mr-2 h-4 w-4" />
              Conectar
            </Button>
          ) : (
            <Button
              variant="secondary"
              className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-transparent text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-border)]/30"
              onClick={() => disconnectMutation.mutate()}
              disabled={disconnectMutation.isPending}
            >
              <LogOut className="mr-2 h-4 w-4" />
              Desconectar
            </Button>
          )}
        </div>
      </div>
    </Card>
  );
}
