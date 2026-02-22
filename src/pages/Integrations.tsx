import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { YouTubeIntegrationCard } from "@/components/videos/YouTubeIntegrationCard";
import { useAuth } from "@/lib/auth";
import { getMyYouTubeIntegration } from "@/lib/youtubeIntegrationDb";

export default function Integrations() {
  const { user, activeCompanyId } = useAuth();
  if (!user || !activeCompanyId) return null;

  const tenantId = activeCompanyId;

  const { data: integration } = useQuery({
    queryKey: ["youtube-integration", tenantId, user.id],
    queryFn: () => getMyYouTubeIntegration(tenantId, user.id),
  });

  const status = integration?.status ?? "disconnected";

  return (
    <div className="mx-auto w-full max-w-6xl px-4 pb-10 pt-6 sm:px-6">
      <div>
        <div className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Conta</div>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-[color:var(--sinaxys-ink)] sm:text-3xl">Conexões</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Conecte suas contas externas para habilitar recursos (ex.: publicar vídeos diretamente no YouTube).
        </p>
      </div>

      <Card className="mt-6 rounded-3xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm font-semibold text-[color:var(--sinaxys-ink)]">Status geral</div>
            <div className="mt-1 text-sm text-muted-foreground">Você pode compartilhar este link com o usuário para ele configurar a conta.</div>
          </div>
          <Badge className={
            status === "connected"
              ? "rounded-full bg-emerald-500/15 text-emerald-300 ring-1 ring-emerald-500/25"
              : status === "revoked"
                ? "rounded-full bg-amber-500/15 text-amber-200 ring-1 ring-amber-500/25"
                : "rounded-full bg-[color:var(--sinaxys-border)]/70 text-[color:var(--sinaxys-ink)]"
          }>
            YouTube: {status === "connected" ? "Conectado" : status === "revoked" ? "Revogado" : "Não conectado"}
          </Badge>
        </div>
        <Separator className="my-4 bg-[color:var(--sinaxys-border)]/70" />
        <div className="grid gap-4">
          <YouTubeIntegrationCard tenantId={tenantId} userId={user.id} />
        </div>
      </Card>
    </div>
  );
}
