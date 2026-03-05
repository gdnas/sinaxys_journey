import { ExternalLink, FileText, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getFigmaEmbedUrl } from "@/lib/sinaxys";

export function ResourceEmbed({
  url,
  title,
}: {
  url: string;
  title: string;
}) {
  const figmaEmbed = getFigmaEmbedUrl(url);
  const teamsEmbed = getTeamsEmbedUrl(url);

  let host = "";
  try {
    host = new URL(url).hostname.replace("www.", "");
  } catch {
    host = "";
  }

  const isVideo = teamsEmbed !== null || isYouTubeUrl(url);

  return (
    <div className="grid gap-3">
      <div className="flex flex-col items-stretch justify-between gap-2 sm:flex-row sm:items-center">
        <div className="flex items-center gap-2 text-sm font-medium text-[color:var(--sinaxys-ink)]">
          {isVideo ? (
            <Video className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
          ) : (
            <FileText className="h-4 w-4 text-[color:var(--sinaxys-primary)]" />
          )}
          {isVideo ? "Vídeo" : "Material"}
          {host ? (
            <span className="ml-1 inline-flex items-center rounded-full border border-[color:var(--sinaxys-border)] bg-white px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
              {host}
            </span>
          ) : null}
        </div>
        <Button asChild variant="outline" className="w-full rounded-xl bg-white sm:w-auto">
          <a href={url} target="_blank" rel="noreferrer">
            <ExternalLink className="mr-2 h-4 w-4" />
            Abrir em nova aba
          </a>
        </Button>
      </div>

      {teamsEmbed ? (
        <div className="overflow-hidden rounded-2xl border bg-white">
          <iframe
            title={title}
            src={teamsEmbed}
            className="h-[70vh] w-full md:h-[640px]"
            allowFullScreen
            allow="autoplay; fullscreen"
          />
        </div>
      ) : figmaEmbed ? (
        <div className="overflow-hidden rounded-2xl border bg-white">
          <iframe
            title={title}
            src={figmaEmbed}
            className="h-[70vh] w-full md:h-[640px]"
            allowFullScreen
          />
        </div>
      ) : isYouTubeUrl(url) ? (
        <div className="overflow-hidden rounded-2xl border bg-white">
          <iframe
            title={title}
            src={getYouTubeEmbedUrl(url)}
            className="h-[70vh] w-full md:h-[640px]"
            allowFullScreen
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          />
        </div>
      ) : (
        <div className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] p-4 text-sm text-muted-foreground">
          Prévia indisponível para este link. Use "Abrir em nova aba".
        </div>
      )}
    </div>
  );
}

function isYouTubeUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.hostname === "www.youtube.com" ||
      parsed.hostname === "youtube.com" ||
      parsed.hostname === "youtu.be" ||
      parsed.hostname === "m.youtube.com"
    );
  } catch {
    return false;
  }
}

function getYouTubeEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);

    if (parsed.hostname === "youtu.be") {
      const videoId = parsed.pathname.slice(1);
      return `https://www.youtube.com/embed/${videoId}`;
    }

    if (parsed.hostname.includes("youtube.com")) {
      const videoId = parsed.searchParams.get("v");
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }

    return null;
  } catch {
    return null;
  }
}

function getTeamsEmbedUrl(url: string): string | null {
  try {
    const parsed = new URL(url);

    // Check if it's a Microsoft Teams/Stream URL
    if (
      parsed.hostname.includes("microsoft.com") ||
      parsed.hostname.includes("teams.microsoft.com") ||
      parsed.hostname.includes("web.microsoftstream.com") ||
      parsed.hostname.includes("microsoftstream.com")
    ) {
      // For Microsoft Stream videos, convert to embed URL
      if (parsed.hostname.includes("microsoftstream.com")) {
        const videoId = parsed.pathname.split("/").pop();
        if (videoId) {
          return `https://web.microsoftstream.com/embed/video/${videoId}`;
        }
      }

      // For Teams meeting recordings, the URL might already be an embed URL
      // or we might need to convert it
      if (parsed.searchParams.has("embed")) {
        return url;
      }

      // Try to extract video ID and create embed URL
      const videoId = parsed.searchParams.get("videoId") || parsed.pathname.split("/").pop();
      if (videoId) {
        return `https://teams.microsoft.com/_#/l/video/${videoId}?embed=true`;
      }

      // Return the original URL if we can't convert it
      // The iframe might still work with some Teams URLs
      return url;
    }

    return null;
  } catch {
    return null;
  }
}