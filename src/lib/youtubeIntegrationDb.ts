import { supabase } from "@/integrations/supabase/client";

export type YouTubeIntegrationStatus = "connected" | "disconnected" | "revoked";

export type DbUserVideoIntegration = {
  id: string;
  tenant_id: string;
  user_id: string;
  provider: "youtube";
  status: YouTubeIntegrationStatus;
  created_at: string;
  updated_at: string;
  revoked_at: string | null;
};

const baseSelect = "id,tenant_id,user_id,provider,status,created_at,updated_at,revoked_at";

export async function getMyYouTubeIntegration(tenantId: string, userId: string) {
  const { data, error } = await supabase
    .from("user_video_integrations")
    .select(baseSelect)
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("provider", "youtube")
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as DbUserVideoIntegration | null;
}

export async function disconnectYouTube() {
  const { data, error } = await supabase.functions.invoke("youtube-disconnect", { body: {} });
  if (error) throw error;
  if (!data?.ok) throw new Error(String(data?.message ?? "Não foi possível desconectar."));
  return data as { ok: true };
}

export async function startYouTubeConnect(redirectTo: string) {
  const { data, error } = await supabase.functions.invoke("youtube-connect", {
    body: { redirectTo },
  });
  if (error) throw error;
  if (!data?.ok || !data?.authUrl) throw new Error(String(data?.message ?? "Não foi possível iniciar conexão."));
  return data as { ok: true; authUrl: string };
}
