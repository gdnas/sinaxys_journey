import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { decryptToken } from "../_shared/youtubeCrypto.ts";

const functionName = "youtube-finalize-upload";

type Body = {
  trailVideoId: string;
  // Optional: allow client to provide videoId parsed from upload response
  youtubeVideoId?: string;
};

function json(status: number, body: unknown) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

async function refreshAccessToken(refreshToken: string, clientId: string, clientSecret: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }).toString(),
  });

  const jsonBody = (await res.json().catch(() => null)) as any;
  if (!res.ok) {
    return { ok: false as const, status: res.status, jsonBody };
  }

  const accessToken = String(jsonBody.access_token ?? "").trim();
  const expiresIn = Number(jsonBody.expires_in ?? 0);
  const expiresAt = expiresIn ? new Date(Date.now() + expiresIn * 1000).toISOString() : null;
  return { ok: true as const, accessToken, expiresAt };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method !== "POST") return json(405, { ok: false, message: "Method not allowed" });

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json(401, { ok: false, message: "Unauthorized" });

    const token = authHeader.replace("Bearer ", "").trim();
    if (!token) return json(401, { ok: false, message: "Unauthorized" });

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const GOOGLE_CLIENT_ID = Deno.env.get("YOUTUBE_GOOGLE_CLIENT_ID")!;
    const GOOGLE_CLIENT_SECRET = Deno.env.get("YOUTUBE_GOOGLE_CLIENT_SECRET")!;
    const TOKEN_ENC_KEY = Deno.env.get("YOUTUBE_TOKEN_ENC_KEY")!;

    const userClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { data: authData, error: authError } = await userClient.auth.getUser(token);
    if (authError || !authData?.user) {
      console.warn(`[${functionName}] invalid token`, { authError: authError?.message });
      return json(401, { ok: false, message: "Unauthorized" });
    }

    const userId = authData.user.id;

    const body = (await req.json().catch(() => null)) as Body | null;
    const trailVideoId = String(body?.trailVideoId ?? "").trim();
    const youtubeVideoIdFromClient = String(body?.youtubeVideoId ?? "").trim() || null;

    if (!trailVideoId) return json(400, { ok: false, message: "trailVideoId obrigatório." });

    const { data: profile, error: profErr } = await service
      .from("profiles")
      .select("company_id")
      .eq("id", userId)
      .maybeSingle();

    if (profErr) {
      console.error(`[${functionName}] failed to load profile`, { error: profErr.message });
      return json(500, { ok: false, message: "Erro ao validar usuário." });
    }

    const tenantId = profile?.company_id ?? null;
    if (!tenantId) return json(400, { ok: false, message: "Usuário sem empresa vinculada." });

    // Load trail video
    const { data: tv, error: tvErr } = await service
      .from("trail_videos")
      .select("id,status,youtube_video_id")
      .eq("id", trailVideoId)
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .maybeSingle();

    if (tvErr || !tv) {
      return json(404, { ok: false, message: "Publicação não encontrada." });
    }

    // Load integration
    const { data: integ, error: integErr } = await service
      .from("user_video_integrations")
      .select("status,refresh_token_enc,refresh_token_iv,access_token,access_token_expires_at")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .eq("provider", "youtube")
      .maybeSingle();

    if (integErr || !integ) {
      return json(403, { ok: false, message: "Conecte sua conta do YouTube." });
    }

    if (integ.status !== "connected") {
      return json(403, { ok: false, message: "Conecte sua conta do YouTube." });
    }

    let accessToken = String(integ.access_token ?? "").trim();
    const exp = integ.access_token_expires_at ? new Date(integ.access_token_expires_at).getTime() : 0;
    const needsRefresh = !accessToken || !exp || exp < Date.now() + 60_000;

    if (needsRefresh) {
      if (!integ.refresh_token_enc || !integ.refresh_token_iv) {
        return json(403, { ok: false, message: "Sessão expirada. Reconecte o YouTube." });
      }

      const refreshToken = await decryptToken(integ.refresh_token_enc, integ.refresh_token_iv, TOKEN_ENC_KEY);
      const refreshed = await refreshAccessToken(refreshToken, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET);
      if (!refreshed.ok || !refreshed.accessToken) {
        console.error(`[${functionName}] refresh token failed`, { status: (refreshed as any).status, jsonBody: (refreshed as any).jsonBody });
        await service
          .from("user_video_integrations")
          .update({ status: "revoked", access_token: null, access_token_expires_at: null })
          .eq("tenant_id", tenantId)
          .eq("user_id", userId)
          .eq("provider", "youtube");
        return json(403, { ok: false, message: "Token revogado. Conecte novamente o YouTube." });
      }

      accessToken = refreshed.accessToken;
      await service
        .from("user_video_integrations")
        .update({ access_token: accessToken, access_token_expires_at: refreshed.expiresAt, status: "connected" })
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .eq("provider", "youtube");
    }

    // Determine youtube video id
    let youtubeVideoId = youtubeVideoIdFromClient || String(tv.youtube_video_id ?? "").trim() || null;

    if (!youtubeVideoId) {
      // Try to infer latest uploaded video (best-effort) — not perfect but works for MVP
      const listRes = await fetch(
        "https://www.googleapis.com/youtube/v3/videos?part=id&mine=true&maxResults=5",
        {
          method: "GET",
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      const listJson = (await listRes.json().catch(() => null)) as any;
      if (listRes.ok) {
        const first = listJson?.items?.[0]?.id;
        if (first) youtubeVideoId = String(first);
      }
    }

    if (!youtubeVideoId) {
      // Mark as processing but without ID
      await service.from("trail_videos").update({ status: "processing" }).eq("id", trailVideoId);
      return json(200, { ok: true, status: "processing" });
    }

    // Check status of the video
    const statusRes = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?part=status,processingDetails&id=${encodeURIComponent(youtubeVideoId)}`,
      {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    const statusJson = (await statusRes.json().catch(() => null)) as any;
    if (!statusRes.ok) {
      console.warn(`[${functionName}] status check failed`, { status: statusRes.status, statusJson });
      await service
        .from("trail_videos")
        .update({ status: "processing", youtube_video_id: youtubeVideoId })
        .eq("id", trailVideoId);
      return json(200, { ok: true, status: "processing", youtubeVideoId });
    }

    const uploadStatus = String(statusJson?.items?.[0]?.status?.uploadStatus ?? "");
    const processingStatus = String(statusJson?.items?.[0]?.processingDetails?.processingStatus ?? "");

    let nextStatus: "processing" | "published" = "processing";

    if (uploadStatus === "processed" || processingStatus === "succeeded") {
      nextStatus = "published";
    }

    await service
      .from("trail_videos")
      .update({ status: nextStatus, youtube_video_id: youtubeVideoId, error_message: null })
      .eq("id", trailVideoId);

    return json(200, {
      ok: true,
      status: nextStatus,
      youtubeVideoId,
      youtubeUrl: `https://www.youtube.com/watch?v=${encodeURIComponent(youtubeVideoId)}`,
      uploadStatus,
      processingStatus,
    });
  } catch (error) {
    console.error(`[${functionName}] unexpected`, { error: String(error) });
    return json(500, { ok: false, message: "Erro inesperado." });
  }
});
