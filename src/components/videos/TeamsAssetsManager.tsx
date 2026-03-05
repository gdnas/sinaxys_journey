import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function TeamsAssetsManager() {
  const qc = useQueryClient();
  const [link, setLink] = useState("");
  const [playingUrl, setPlayingUrl] = useState<string | null>(null);

  const assetsQuery = useQuery({
    queryKey: ["teams-assets"],
    queryFn: async () => {
      const { data } = await supabase.from("video_assets").select("id,title,source_url,metadata");
      return (data ?? []) as any[];
    },
  });

  const addMutation = useMutation({
    mutationFn: async (url: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch("/functions/v1/teams-resolve-recording", {
        method: "POST",
        headers: { Authorization: token ? `Bearer ${token}` : "" , "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Falha");
      return json.item;
    },
    onSuccess: async () => {
      await qc.invalidateQueries({ queryKey: ["teams-assets"] });
    },
  });

  const playbackMutation = useMutation({
    mutationFn: async (assetId: string) => {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch("/functions/v1/teams-playback-url", {
        method: "POST",
        headers: { Authorization: token ? `Bearer ${token}` : "", "Content-Type": "application/json" },
        body: JSON.stringify({ assetId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error ?? "Falha");
      return json.playbackUrl;
    },
    onSuccess: (url) => setPlayingUrl(url),
  });

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <Input value={link} onChange={(e: any) => setLink(e.target.value)} placeholder="Cole o link de compartilhamento do OneDrive/SharePoint" />
        <Button onClick={() => addMutation.mutate(link)}>Adicionar</Button>
      </div>

      <div>
        {assetsQuery.isLoading ? (
          <div>Carregando…</div>
        ) : (
          <div className="space-y-2">
            {(assetsQuery.data ?? []).map((a: any) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border p-2">
                <div>
                  <div className="font-medium">{a.title ?? a.source_url}</div>
                  <div className="text-xs text-muted-foreground">{a.source_url}</div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={() => playbackMutation.mutate(a.id)}>Tocar</Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {playingUrl ? (
        <div>
          <video controls src={playingUrl} className="w-full rounded-lg border" />
        </div>
      ) : null}
    </div>
  );
}