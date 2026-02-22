import { useMemo, useState } from "react";
import { Link2, LogOut, Settings2, Youtube } from "lucide-react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { EdgeFunctionError, startYouTubeConnect, disconnectYouTube, getMyYouTubeIntegration } from "@/lib/youtubeIntegrationDb";
import { getYouTubeHealth } from "@/lib/youtubeHealth";

function ConfigChecklist({ details }: { details?: string }) {
  const items = [
    "YOUTUBE_GOOGLE_CLIENT_ID",
    "YOUTUBE_GOOGLE_CLIENT_SECRET",
    "YOUTUBE_OAUTH_STATE_SECRET",
    "APP_BASE_URL",
    "YOUTUBE_TOKEN_ENC_KEY",
  ];

  const healthQuery = useQuery({
    queryKey: ["youtube-health"],
    queryFn: () => getYouTubeHealth(),
    retry: false,
  });

  const missing = healthQuery.data?.missing ?? [];
  const ok = healthQuery.data?.ok ?? false;

  return (
    <div className="grid gap-3">
      <div className="text-sm text-muted-foreground">
        Plug-n-play: esta tela ajuda a diagnosticar configuração (Google OAuth / secrets) quando a conexão não abre.
      </div>

      {healthQuery.data && !ok ? (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-100">
          <div className="font-semibold">Configuração pendente</div>
          <div className="mt-1 opacity-90">
            Faltam chaves no backend. Um administrador precisa configurar os secrets no Supabase.
          </div>
        </div>
      ) : null}

      {healthQuery.data?.oauthProjectNumber ? (
        <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/20 p-3 text-xs text-muted-foreground">
          <div className="font-semibold text-[color:var(--sinaxys-ink)]">Projeto do OAuth (extraído do Client ID)</div>
          <div className="mt-1 break-words">{healthQuery.data.oauthProjectNumber}</div>
          {healthQuery.data.youtubeEnableUrl ? (
            <a
              className="mt-2 inline-block font-medium text-[color:var(--sinaxys-primary)] hover:underline"
              href={healthQuery.data.youtubeEnableUrl}
              target="_blank"
              rel="noreferrer"
            >
              Abrir YouTube Data API v3 neste projeto
            </a>
          ) : null}
          <div className="mt-2 opacity-80">
            Dica: o erro 403 "API disabled / not used" costuma acontecer quando a API está habilitada em um projeto diferente deste.
          </div>
        </div>
      ) : null}

      {healthQuery.data?.redirectUri ? (
        <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/20 p-3 text-xs text-muted-foreground">
          <div className="font-semibold text-[color:var(--sinaxys-ink)]">redirect_uri (Google OAuth)</div>
          <div className="mt-1 break-words">{healthQuery.data.redirectUri}</div>
        </div>
      ) : null}

      <div className="grid gap-2">
        {items.map((k) => {
          const configured = healthQuery.data?.configured?.[k];
          const isMissing = missing.includes(k);

          return (
            <div
              key={k}
              className="flex items-center justify-between rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/20 px-3 py-2"
            >
              <div className="text-sm font-medium text-[color:var(--sinaxys-ink)]">{k}</div>
              {healthQuery.isLoading ? (
                <Badge className="rounded-full bg-[color:var(--sinaxys-border)]/60 text-[color:var(--sinaxys-ink)]">checando…</Badge>
              ) : configured ? (
                <Badge className="rounded-full bg-emerald-500/15 text-emerald-200 ring-1 ring-emerald-500/25">ok</Badge>
              ) : isMissing ? (
                <Badge className="rounded-full bg-rose-500/15 text-rose-200 ring-1 ring-rose-500/25">missing</Badge>
              ) : (
                <Badge className="rounded-full bg-[color:var(--sinaxys-border)]/60 text-[color:var(--sinaxys-ink)]">required</Badge>
              )}
            </div>
          );
        })}
      </div>

      {details && !ok ? (
        <div className="rounded-2xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs text-amber-100">
          <div className="font-semibold">Detalhes</div>
          <div className="mt-1 break-words opacity-90">{details}</div>
        </div>
      ) : null}

      {healthQuery.isError ? (
        <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-3 text-xs text-rose-100">
          <div className="font-semibold">Falha ao checar configuração</div>
          <div className="mt-1 opacity-90">{String((healthQuery.error as any)?.message ?? "")}</div>
        </div>
      ) : null}
    </div>
  );
}

export function YouTubeIntegrationCard({ tenantId, userId }: { tenantId: string; userId: string }) {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [cfgOpen, setCfgOpen] = useState(false);
  const [lastError, setLastError] = useState<{ status?: number; details?: string } | null>(null);

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
      // Clear stale error (e.g., user configured secrets after a previous failure)
      setLastError(null);
      const { authUrl } = await startYouTubeConnect("/videos");
      window.location.href = authUrl;
    },
    onError: (e: any) => {
      const err = e as EdgeFunctionError;
      const status = err?.status;
      const details = err?.details ?? String(e?.message ?? "Tente novamente.");
      setLastError({ status, details });

      toast({
        title: "Falha ao conectar",
        description: status ? `HTTP ${status} — ${details}` : details,
        variant: "destructive",
      });

      setCfgOpen(true);
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
      const err = e as EdgeFunctionError;
      const status = err?.status;
      const details = err?.details ?? String(e?.message ?? "Tente novamente.");
      toast({
        title: "Não foi possível desconectar",
        description: status ? `HTTP ${status} — ${details}` : details,
        variant: "destructive",
      });
    },
  });

  return (
    <>
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

          <div className="flex flex-col items-end gap-2">
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

            <Button
              type="button"
              variant="secondary"
              className="h-9 rounded-2xl border border-[color:var(--sinaxys-border)] bg-transparent px-3 text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-border)]/30"
              onClick={() => setCfgOpen(true)}
            >
              <Settings2 className="mr-2 h-4 w-4" />
              Verificar configuração
            </Button>
          </div>
        </div>

        {lastError?.details ? (
          <>
            <Separator className="my-4 bg-[color:var(--sinaxys-border)]/70" />
            <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-3 text-xs text-rose-100">
              <div className="font-semibold">Último erro</div>
              <div className="mt-1 break-words opacity-90">
                {lastError.status ? `HTTP ${lastError.status} — ` : ""}
                {lastError.details}
              </div>
            </div>
          </>
        ) : null}
      </Card>

      <Dialog open={cfgOpen} onOpenChange={setCfgOpen}>
        <DialogContent className="max-w-[92vw] rounded-3xl sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Configuração do YouTube</DialogTitle>
          </DialogHeader>
          <ConfigChecklist details={lastError?.details} />
        </DialogContent>
      </Dialog>
    </>
  );
}