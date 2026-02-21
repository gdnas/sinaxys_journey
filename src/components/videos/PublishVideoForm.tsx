import { useMemo, useRef, useState } from "react";
import { ExternalLink, Film, Loader2, Upload } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { createUploadSession, finalizeUpload, markTrailVideoError, type TrailVideoPrivacy } from "@/lib/trailVideosDb";
import { UploadProgressBar } from "@/components/videos/UploadProgressBar";

function formatBytes(bytes: number) {
  const b = Number(bytes);
  if (!Number.isFinite(b) || b <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  let idx = 0;
  let v = b;
  while (v >= 1024 && idx < units.length - 1) {
    v /= 1024;
    idx++;
  }
  return `${v.toFixed(idx === 0 ? 0 : 1)} ${units[idx]}`;
}

async function putFileWithProgress(uploadUrl: string, file: File, onProgress: (pct: number) => void) {
  return await new Promise<{ ok: boolean; status: number; text: string; json: any | null }>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl);
    xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");

    xhr.upload.onprogress = (evt) => {
      if (!evt.lengthComputable) return;
      const pct = (evt.loaded / evt.total) * 100;
      onProgress(pct);
    };

    xhr.onload = () => {
      const text = xhr.responseText || "";
      let json: any | null = null;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        json = null;
      }
      resolve({ ok: xhr.status >= 200 && xhr.status < 300, status: xhr.status, text, json });
    };

    xhr.onerror = () => reject(new Error("Falha de rede durante upload."));
    xhr.onabort = () => reject(new Error("Upload cancelado."));

    xhr.send(file);
  });
}

export function PublishVideoForm({ connected }: { connected: boolean }) {
  const { toast } = useToast();
  const qc = useQueryClient();

  const inputRef = useRef<HTMLInputElement | null>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [privacy, setPrivacy] = useState<TrailVideoPrivacy>("unlisted");

  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{
    trailVideoId: string;
    status: "uploading" | "processing" | "published" | "error";
    youtubeVideoId?: string;
    youtubeUrl?: string;
  } | null>(null);

  const canPublish = connected && !!file && !!title.trim();

  const fileMeta = useMemo(() => {
    if (!file) return null;
    return { name: file.name, size: formatBytes(file.size), type: file.type || "video/*" };
  }, [file]);

  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!file) throw new Error("Selecione um vídeo.");
      const t = title.trim();
      if (!t) throw new Error("Informe um título.");

      setProgress(0);
      setResult(null);

      const init = await createUploadSession({
        title: t,
        description,
        privacyStatus: privacy,
        fileSizeBytes: file.size,
        contentType: file.type || "video/mp4",
        fileName: file.name,
      });

      setResult({ trailVideoId: init.trailVideoId, status: "uploading" });

      const uploadRes = await putFileWithProgress(init.uploadUrl, file, setProgress);
      if (!uploadRes.ok) {
        await markTrailVideoError(init.trailVideoId, `upload_failed:${uploadRes.status}`);
        throw new Error(
          uploadRes.status === 401 || uploadRes.status === 403
            ? "Sessão expirada. Reconecte o YouTube e tente novamente."
            : "Falha no upload. Tente novamente.",
        );
      }

      const youtubeVideoId = String(uploadRes.json?.id ?? "").trim() || undefined;

      setResult({ trailVideoId: init.trailVideoId, status: "processing", youtubeVideoId });

      const final = await finalizeUpload({ trailVideoId: init.trailVideoId, youtubeVideoId });

      // invalidate list
      await qc.invalidateQueries({ queryKey: ["trail-videos"] });

      return { ...final, trailVideoId: init.trailVideoId };
    },
    onSuccess: (data) => {
      if (data.status === "published") {
        toast({ title: "Publicado no YouTube" });
      } else {
        toast({ title: "Enviado", description: "O YouTube está processando o vídeo." });
      }

      setResult({
        trailVideoId: data.trailVideoId,
        status: data.status,
        youtubeVideoId: data.youtubeVideoId,
        youtubeUrl: data.youtubeUrl,
      });
    },
    onError: (e: any) => {
      toast({
        title: "Não foi possível publicar",
        description: String(e?.message ?? "Tente novamente."),
        variant: "destructive",
      });
      setResult((prev) => (prev ? { ...prev, status: "error" } : prev));
    },
  });

  return (
    <Card className="rounded-3xl border-[color:var(--sinaxys-border)] bg-[color:var(--sinaxys-tint)] p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold tracking-tight text-[color:var(--sinaxys-ink)]">Publicar no YouTube</div>
          <p className="mt-1 text-sm text-muted-foreground">Sem armazenar na Kairoos: o upload vai direto do seu navegador para o YouTube.</p>
        </div>
        <div className="grid h-10 w-10 place-items-center rounded-2xl bg-[color:var(--sinaxys-border)]/30">
          <Film className="h-5 w-5 text-[color:var(--sinaxys-ink)]/80" />
        </div>
      </div>

      {!connected ? (
        <div className="mt-4 rounded-2xl border border-amber-500/25 bg-amber-500/10 p-4 text-sm text-amber-100">
          Conecte sua conta do YouTube para publicar.
        </div>
      ) : null}

      <div className="mt-5 grid gap-4">
        <div className="grid gap-2">
          <Label>Vídeo</Label>
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Input
              ref={inputRef}
              type="file"
              accept="video/*"
              className="rounded-2xl border-[color:var(--sinaxys-border)] bg-transparent text-[color:var(--sinaxys-ink)] file:rounded-xl file:border-0 file:bg-[color:var(--sinaxys-border)]/40 file:px-4 file:py-2 file:text-[color:var(--sinaxys-ink)]"
              onChange={(e) => {
                const f = e.target.files?.[0] ?? null;
                setFile(f);
                setProgress(0);
                setResult(null);
              }}
              disabled={publishMutation.isPending}
            />
            <Button
              type="button"
              variant="secondary"
              className="rounded-2xl border border-[color:var(--sinaxys-border)] bg-transparent text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-border)]/30"
              onClick={() => inputRef.current?.click()}
              disabled={publishMutation.isPending}
            >
              <Upload className="mr-2 h-4 w-4" />
              Selecionar
            </Button>
          </div>
          {fileMeta ? (
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="rounded-full bg-[color:var(--sinaxys-border)]/30 px-2.5 py-1">{fileMeta.name}</span>
              <span className="rounded-full bg-[color:var(--sinaxys-border)]/30 px-2.5 py-1">{fileMeta.size}</span>
              <span className="rounded-full bg-[color:var(--sinaxys-border)]/30 px-2.5 py-1">{fileMeta.type}</span>
            </div>
          ) : null}
        </div>

        <div className="grid gap-2">
          <Label>Título</Label>
          <Input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Ex.: Treinamento — Atendimento ao cliente"
            className="rounded-2xl border-[color:var(--sinaxys-border)] bg-transparent text-[color:var(--sinaxys-ink)]"
            disabled={publishMutation.isPending}
          />
        </div>

        <div className="grid gap-2">
          <Label>Descrição</Label>
          <Textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="(opcional)"
            className="min-h-28 rounded-2xl border-[color:var(--sinaxys-border)] bg-transparent text-[color:var(--sinaxys-ink)]"
            disabled={publishMutation.isPending}
          />
        </div>

        <div className="grid gap-2">
          <Label>Privacidade</Label>
          <Select value={privacy} onValueChange={(v) => setPrivacy(v as any)} disabled={publishMutation.isPending}>
            <SelectTrigger className="rounded-2xl border-[color:var(--sinaxys-border)] bg-transparent text-[color:var(--sinaxys-ink)]">
              <SelectValue placeholder="Selecione" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="private">Privado</SelectItem>
              <SelectItem value="unlisted">Não listado</SelectItem>
              <SelectItem value="public">Público</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {publishMutation.isPending ? <UploadProgressBar value={progress} /> : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <Button
            onClick={() => publishMutation.mutate()}
            disabled={!canPublish || publishMutation.isPending}
            className="rounded-2xl bg-[color:var(--sinaxys-primary)] text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-primary)]/90"
          >
            {publishMutation.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Publicando…
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Publicar
              </>
            )}
          </Button>

          {result?.youtubeUrl ? (
            <a
              href={result.youtubeUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-2xl border border-[color:var(--sinaxys-border)] bg-transparent px-4 py-2 text-sm font-medium text-[color:var(--sinaxys-ink)] hover:bg-[color:var(--sinaxys-border)]/30"
            >
              <ExternalLink className="mr-2 h-4 w-4" />
              Abrir no YouTube
            </a>
          ) : null}
        </div>

        {result ? (
          <div className="rounded-2xl border border-[color:var(--sinaxys-border)]/70 bg-[color:var(--sinaxys-bg)]/20 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="inline-flex items-center gap-2 rounded-full bg-[color:var(--sinaxys-border)]/30 px-3 py-1 text-xs text-[color:var(--sinaxys-ink)]">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-[color:var(--sinaxys-primary)]" />
                <span className="font-medium">Status:</span>
                <span className="text-muted-foreground">
                  {result.status === "uploading"
                    ? "Enviando"
                    : result.status === "processing"
                      ? "Processando"
                      : result.status === "published"
                        ? "Publicado"
                        : "Falhou"}
                </span>
              </div>
              <div className="text-xs text-muted-foreground">ID interno: {result.trailVideoId}</div>
            </div>

            {result.youtubeVideoId ? (
              <div className="mt-2 text-sm text-[color:var(--sinaxys-ink)]">
                <span className="text-muted-foreground">videoId:</span> <span className="font-medium">{result.youtubeVideoId}</span>
              </div>
            ) : null}
          </div>
        ) : null}

        {!connected ? (
          <div className="text-xs text-muted-foreground">Dica: se o token foi revogado, desconecte e conecte novamente.</div>
        ) : null}
      </div>
    </Card>
  );
}
