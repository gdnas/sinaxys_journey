import { supabase } from "@/integrations/supabase/client";

export type YouTubeHealth = {
  ok: boolean;
  provider: "youtube";
  missing: string[];
  configured: Record<string, boolean>;
  redirectUri: string | null;
};

export async function getYouTubeHealth(): Promise<YouTubeHealth> {
  const { data, error } = await supabase.functions.invoke("youtube-health", { body: {} });
  if (error) throw error;
  return data as YouTubeHealth;
}