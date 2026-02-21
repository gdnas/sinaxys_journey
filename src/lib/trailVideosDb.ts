import { supabase } from "@/integrations/supabase/client";

export type TrailVideoPrivacy = "private" | "unlisted" | "public";
export type TrailVideoStatus = "draft" | "uploading" | "processing" | "published" | "error";

export type DbTrailVideo = {
  id: string;
  tenant_id: string;
  user_id: string;
  title: string;
  description: string | null;
  privacy: TrailVideoPrivacy;
  file_name: string | null;
  youtube_video_id: string | null;
  status: TrailVideoStatus;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};

const baseSelect =
  "id,tenant_id,user_id,title,description,privacy,file_name,youtube_video_id,status,error_message,created_at,updated_at";

export async function listMyTrailVideos(tenantId: string, userId: string) {
  const { data, error } = await supabase
    .from("trail_videos")
    .select(baseSelect)
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data ?? []) as DbTrailVideo[];
}

export async function createUploadSession(payload: {
  title: string;
  description?: string;
  privacyStatus: TrailVideoPrivacy;
  fileSizeBytes: number;
  contentType: string;
  fileName?: string;
}) {
  const { data, error } = await supabase.functions.invoke("youtube-create-upload-session", { body: payload });
  if (error) throw error;
  if (!data?.ok || !data?.uploadUrl || !data?.trailVideoId) {
    throw new Error(String(data?.message ?? "Não foi possível iniciar o upload."));
  }
  return data as { ok: true; uploadUrl: string; trailVideoId: string };
}

export async function finalizeUpload(payload: { trailVideoId: string; youtubeVideoId?: string }) {
  const { data, error } = await supabase.functions.invoke("youtube-finalize-upload", { body: payload });
  if (error) throw error;
  if (!data?.ok) throw new Error(String(data?.message ?? "Não foi possível finalizar."));
  return data as {
    ok: true;
    status: "processing" | "published";
    youtubeVideoId?: string;
    youtubeUrl?: string;
  };
}

export async function markTrailVideoError(trailVideoId: string, message: string) {
  const { error } = await supabase
    .from("trail_videos")
    .update({ status: "error", error_message: message })
    .eq("id", trailVideoId);
  if (error) throw error;
}
