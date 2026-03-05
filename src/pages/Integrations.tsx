import { useQuery } from "@tanstack/react-query";
import { CheckCircle2, Copy, Info, ShieldCheck, Youtube, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/hooks/use-toast";
import { YouTubeIntegrationCard } from "@/components/videos/YouTubeIntegrationCard";
import { TeamsIntegrationCard } from "@/components/videos/TeamsIntegrationCard";
import { useAuth } from "@/lib/auth";
import { getMyYouTubeIntegration, startYouTubeConnect } from "@/lib/youtubeIntegrationDb";
import { getMyTeamsIntegration } from "@/lib/teamsIntegrationDb";
import { getYouTubeHealth } from "@/lib/youtubeHealth";
import { getTeamsHealth } from "@/lib/teamsIntegrationDb";
import { useEffect } from "react";

export default function Integrations() {
  const { toast } = useToast();
  const { user, activeCompanyId } = useAuth();
  if (!user || !activeCompanyId) return null;

  const tenantId = activeCompanyId;

  const { data: youtubeIntegration } = useQuery({
    queryKey: ["youtube-integration", tenantId, user.id],
    queryFn: () => getMyYouTubeIntegration(tenantId, user.id),
  });

  const youtubeStatus = youtubeIntegration?.status ?? "disconnected";

  const { data: teamsIntegration } = useQuery({
    queryKey: ["teams-integration", tenantId, user.id],
    queryFn: () => getMyTeamsIntegration(tenantId, user.id),
  });

  const teamsStatus = teamsIntegration?.status ?? "disconnected";

  const healthQuery = useQuery({
    queryKey: ["youtube-health"],
    queryFn: () => getYouTubeHealth(),
    retry: false,
  });

  const teamsHealthQuery = useQuery({
    queryKey: ["teams-health"],
    queryFn: () => getTeamsHealth(),
    retry: false,
  });

  const missing = healthQuery.data?.missing ?? [];
  const configured = (healthQuery.data?.ok ?? false) && missing.length === 0;

  // Handle Teams callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const teamsStatus = params.get("teams");

    if (teamsStatus === "connected") {
      toast({
        title: "Microsoft Teams conectado",
        description: "Sua conta do Teams foi conectada com sucesso.",
      });
      // Remove the query param
      window.history.replaceState({}, "", window.location.pathname);
    } else if (teamsStatus === "error") {
      const reason = params.get("reason") || "Erro desconhecido";
      toast({
        title: "Erro ao conectar Microsoft Teams",
        description: decodeURIComponent(reason),
        variant: "destructive",
      });
      // Remove the query param
      window.history.replaceState({}, "", window.location.pathname);
    }
  }, [toast]);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6 sm:px-6">
      <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr] lg:items-start">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conta</div>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[color:var(--sinaxys-ink)] sm:text-3xl">Integrações</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Integrações plug-and-play: o usuário clica em conectar, faz login e autoriza. Nós não vemos nem armazenamos a senha.
          </p>

          {/* YouTube Integration Card */}
          <Card className="mt-6 rounded-3xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-red-500/15 ring-1 ring-red-500/20">
                  <Youtube className="h-5 w-5 text-red-300" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold tracking-tight text-[color:var(--sinaxys-ink)]">YouTube</div>
                    <Badge
                      className={
                        youtubeStatus === "connected"
                          ? "rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25"
                          : youtubeStatus === "revoked"
                            ? "rounded-full bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/25"
                            : "rounded-full bg-[color:var(--sinaxys-border)]/70 text-[color:var(--sinaxys-ink)]"
                      }
                    >
                      {youtubeStatus === "connected" ? "Conectado" : youtubeStatus === "revoked" ? "Revogado" : "Não conectado"}
                    </Badge>
                  </div>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Publique vídeos direto no seu canal (upload do seu navegador → YouTube).
                  </p>

                  <div className="mt-4 grid gap-2">
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                      <div>
                        <div className="font-medium text-[color:var(--sinaxys-ink)]">1) Conectar</div>
                        <div>O usuário entra com a conta Google/YouTube e autoriza o acesso.</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <ShieldCheck className="mt-0.5 h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                      <div>
                        <div className="font-medium text-[color:var(--sinaxys-ink)]">2) Segurança</div>
                        <div>A senha fica no Google. A Kairoos só recebe tokens de autorização.</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/20 p-4 text-sm text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <Info className="mt-0.5 h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                      <div>
                        <div className="font-medium text-[color:var(--sinaxys-ink)]">Se aparecer "Acesso bloqueado"</div>
                        <div className="mt-1">
                          No Google Cloud, vá em <span className="font-medium">Google Auth Platform → Audience</span> e adicione o e-mail em
                          <span className="font-medium"> Test users</span> (quando o app estiver em "Testing").
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                <Button
                  className="rounded-2xl bg-[color:var(--sinaxys-primary)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-primary)]/90"
                  onClick={async () => {
                    try {
                      const { authUrl } = await startYouTubeConnect("/videos");
                      window.location.href = authUrl;
                    } catch (e: any) {
                      toast({
                        title: "Não foi possível iniciar a conexão",
                        description: String(e?.details ?? e?.message ?? "Tente novamente."),
                        variant: "destructive",
                      });
                    }
                  }}
                >
                  Conectar agora
                </Button>
                <div className="text-xs text-muted-foreground">Leva ~30s</div>
              </div>
            </div>
          </Card>

          {/* Microsoft Teams Integration Card */}
          <Card className="mt-4 rounded-3xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] p-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-indigo-500/15 ring-1 ring-indigo-500/20">
                  <Users className="h-5 w-5 text-indigo-300" />
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="text-sm font-semibold tracking-tight text-[color:var(--sinaxys-ink)]">Microsoft Teams</div>
                    <Badge
                      className={
                        teamsStatus === "connected"
                          ? "rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25"
                          : teamsStatus === "revoked"
                            ? "rounded-full bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/25"
                            : "rounded-full bg-[color:var(--sinaxys-border)]/70 text-[color:var(--sinaxys-ink)]"
                      }
                    >
                      {teamsStatus === "connected" ? "Conectado" : teamsStatus === "revoked" ? "Revogado" : "Não conectado"}
                    </Badge>
                  </div>

                  <p className="mt-1 text-sm text-muted-foreground">
                    Importe reuniões gravadas do Teams para usar nas trilhas de aprendizado.
                  </p>

                  <div className="mt-4 grid gap-2">
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-300" />
                      <div>
                        <div className="font-medium text-[color:var(--sinaxys-ink)]">1) Conectar</div>
                        <div>O usuário entra com a conta Microsoft e autoriza o acesso.</div>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 text-sm text-muted-foreground">
                      <ShieldCheck className="mt-0.5 h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                      <div>
                        <div className="font-medium text-[color:var(--sinaxys-ink)]">2) Segurança</div>
                        <div>A senha fica na Microsoft. A Kairoos só recebe tokens de autorização.</div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-4 rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/20 p-4 text-sm text-muted-foreground">
                    <div className="flex items-start gap-2">
                      <Info className="mt-0.5 h-4 w-4 text-[color:var(--sinaxys-primary)]" />
                      <div>
                        <div className="font-medium text-[color:var(--sinaxys-ink)]">Requisitos</div>
                        <div className="mt-1">
                          Você precisa de permissões para acessar reuniões gravadas. O administrador do Azure AD deve configurar o app registration.
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 flex-col gap-2 sm:items-end">
                <Button
                  className="rounded-2xl bg-[color:var(--sinaxys-primary)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-primary)]/90"
                  onClick={() => {
                    toast({
                      title: "Use o card abaixo",
                      description: "Use o card de integração do Teams abaixo para conectar.",
                    });
                  }}
                >
                  Conectar agora
                </Button>
                <div className="text-xs text-muted-foreground">Leva ~30s</div>
              </div>
            </div>
          </Card>

          <div className="mt-4 space-y-4">
            <YouTubeIntegrationCard tenantId={tenantId} userId={user.id} />
            <TeamsIntegrationCard tenantId={tenantId} userId={user.id} />
          </div>
        </div>

        <div className="lg:sticky lg:top-6">
          <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] p-5">
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Status da configuração</div>
            <p className="mt-1 text-sm text-muted-foreground">
              Se algo estiver faltando no backend, a integração não conecta. Aqui você vê exatamente o que precisa ser configurado.
            </p>

            <Separator className="my-4 bg-[color:var(--sinaxys-border)]/70" />

            {healthQuery.isLoading ? (
              <div className="rounded-2xl bg-[color:var(--sinaxys-bg)]/20 p-4 text-sm text-muted-foreground">Checando…</div>
            ) : healthQuery.data ? (
              <div className="grid gap-3">
                <div
                  className={
                    configured
                      ? "rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4 text-sm text-emerald-100"
                      : "rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100"
                  }
                >
                  <div className="font-semibold">{configured ? "Pronto para conectar" : "Configuração pendente"}</div>
                  <div className="mt-1 opacity-90">
                    {configured
                      ? "Tudo configurado. Se falhar, é quase sempre o app estar em Testing (Test users) ou o redirect_uri no Google Cloud."
                      : "Peça para o administrador configurar as chaves do Google OAuth no Supabase (secrets)."}
                  </div>
                </div>

                {healthQuery.data.redirectUri ? (
                  <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/20 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">redirect_uri (YouTube)</div>
                    <div className="mt-1 break-words text-xs text-[color:var(--sinaxys-ink)]">{healthQuery.data.redirectUri}</div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-3 w-full rounded-2xl border border-[color:var(--sinaxys-border)] bg-transparent text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-border)]/30"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(healthQuery.data.redirectUri ?? "");
                          toast({ title: "Copiado" });
                        } catch {
                          toast({ title: "Não foi possível copiar", variant: "destructive" });
                        }
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar
                    </Button>
                  </div>
                ) : null}

                {teamsHealthQuery.data?.redirectUri ? (
                  <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/20 p-4">
                    <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">redirect_uri (Teams)</div>
                    <div className="mt-1 break-words text-xs text-[color:var(--sinaxys-ink)]">{teamsHealthQuery.data.redirectUri}</div>
                    <Button
                      size="sm"
                      variant="secondary"
                      className="mt-3 w-full rounded-2xl border border-[color:var(--sinaxys-border)] bg-transparent text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-border)]/30"
                      onClick={async () => {
                        try {
                          await navigator.clipboard.writeText(teamsHealthQuery.data.redirectUri ?? "");
                          toast({ title: "Copiado" });
                        } catch {
                          toast({ title: "Não foi possível copiar", variant: "destructive" });
                        }
                      }}
                    >
                      <Copy className="mr-2 h-4 w-4" />
                      Copiar
                    </Button>
                  </div>
                ) : null}

                {missing.length > 0 ? (
                  <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4">
                    <div className="text-sm font-semibold text-rose-100">Faltando (YouTube)</div>
                    <div className="mt-2 grid gap-2">
                      {missing.map((k) => (
                        <div
                          key={k}
                          className="flex items-center justify-between rounded-2xl border border-rose-500/15 bg-[color:var(--sinaxys-bg)]/20 px-3 py-2"
                        >
                          <div className="text-xs font-medium text-rose-50">{k}</div>
                          <Badge className="rounded-full bg-rose-500/15 text-rose-100 ring-1 ring-rose-500/25">required</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/20 p-4 text-sm text-muted-foreground">
                    Nenhuma chave faltando (YouTube).
                  </div>
                )}

                {teamsHealthQuery.data?.missing && teamsHealthQuery.data.missing.length > 0 ? (
                  <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4">
                    <div className="text-sm font-semibold text-rose-100">Faltando (Teams)</div>
                    <div className="mt-2 grid gap-2">
                      {teamsHealthQuery.data.missing.map((k) => (
                        <div
                          key={k}
                          className="flex items-center justify-between rounded-2xl border border-rose-500/15 bg-[color:var(--sinaxys-bg)]/20 px-3 py-2"
                        >
                          <div className="text-xs font-medium text-rose-50">{k}</div>
                          <Badge className="rounded-full bg-rose-500/15 text-rose-100 ring-1 ring-rose-500/25">required</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-bg)]/20 p-4 text-sm text-muted-foreground">
                    Nenhuma chave faltando (Teams).
                  </div>
                )}
              </div>
            ) : (
              <div className="rounded-2xl border border-rose-500/25 bg-rose-500/10 p-4 text-sm text-rose-100">
                Não foi possível checar a configuração.
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}