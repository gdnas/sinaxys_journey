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

async function invokeAuthed<T>(fn: string, body: any): Promise<{ data: T | null; error: any | null }> {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token;

  const { data, error } = await supabase.functions.invoke(fn, {
    body,
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
  });

  return { data: (data ?? null) as any, error: error as any };
}

async function parseEdgeError(error: any): Promise<{ status?: number; details?: string; parsed?: any }> {
  const status = error?.context?.response?.status ?? error?.context?.status ?? error?.status;

  // supabase-js often provides parsed body in error.context.body
  const body = error?.context?.body;
  if (body && typeof body === "object") {
    const details = body?.details ? String(body.details) : JSON.stringify(body);
    return { status, details, parsed: body };
  }

  let details: string | undefined = error?.message ? String(error.message) : undefined;

  const resp = error?.context?.response;
  if (resp && typeof resp.clone === "function") {
    try {
      const text = await resp.clone().text();
      if (text) details = text;
    } catch {
      // ignore
    }
  }

  let parsed: any = null;
  if (details) {
    try {
      parsed = JSON.parse(details);
    } catch {
      parsed = null;
    }
  }

  return { status, details, parsed };
}

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
  const { data, error } = await invokeAuthed<any>("youtube-create-upload-session", payload);

  if (error) {
    const parsed = await parseEdgeError(error);
    const serverMsg = parsed.parsed?.message ?? parsed.parsed?.error ?? parsed.details;
    const serverDetails = parsed.parsed?.details ?? undefined;
    const hint = parsed.parsed?.hint ?? undefined;

    const msg = [serverMsg, serverDetails, hint].filter(Boolean).join("\n");
    throw new Error(msg || "Não foi possível iniciar o upload.");
  }

  if (!data?.ok || !data?.uploadUrl || !data?.trailVideoId) {
    throw new Error(String(data?.message ?? "Não foi possível iniciar o upload."));
  }

  return data as { ok: true; uploadUrl: string; trailVideoId: string };
}

export async function finalizeUpload(payload: { trailVideoId: string; youtubeVideoId?: string }) {
  const { data, error } = await invokeAuthed<any>("youtube-finalize-upload", payload);

  if (error) {
    const parsed = await parseEdgeError(error);
    const serverMsg = parsed.parsed?.message ?? parsed.parsed?.error ?? parsed.details;
    throw new Error(String(serverMsg ?? "Não foi possível finalizar."));
  }

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