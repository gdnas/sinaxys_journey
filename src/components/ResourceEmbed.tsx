import { ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFigmaEmbedUrl } from "@/lib/sinaxys";

export function ResourceEmbed({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const embed = getFigmaEmbedUrl(url);

  return (
    <div className="grid gap-3">
      <div className="flex flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-sm font-medium text-[color:var(--sinaxys-ink)]">
          <FileText className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
          Material de leitura
        </div>
        <Button asChild variant="outline" className="w-full rounded-xl bg-white sm:w-auto">
          <a href={url} target="_blank" rel="noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Abrir em nova aba
          </a>
        </Button>
      </div>

      {embed ? (
        <div className="overflow-hidden rounded-2xl border bg-white">
          <iframe
            title={title}
            src={embed}
            className="h-[70vh] w-full md:h-[640px]"
            allowFullScreen
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
          Não foi possível embutir este link. Use “Abrir em nova aba”.
        </div>
      )}
    </div>
  );
}
