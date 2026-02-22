import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { corsHeaders } from "../_shared/cors.ts";
import { decryptToken } from "../_shared/youtubeCrypto.ts";

const functionName = "youtube-create-upload-session";

type Body = {
  title: string;
  description?: string;
  privacyStatus: "private" | "unlisted" | "public";
  fileSizeBytes: number;
  contentType: string;
  fileName?: string;
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

function tryParseJson(text: string) {
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    return null;
  }
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
    const title = String(body?.title ?? "").trim();
    const description = String(body?.description ?? "");
    const privacyStatus = (body?.privacyStatus ?? "unlisted") as any;
    const fileSizeBytes = Number(body?.fileSizeBytes ?? 0);
    const contentType = String(body?.contentType ?? "").trim() || "video/mp4";
    const fileName = String(body?.fileName ?? "").trim() || null;

    if (!title) return json(400, { ok: false, message: "Informe um título." });
    if (!(["private", "unlisted", "public"] as const).includes(privacyStatus)) {
      return json(400, { ok: false, message: "Privacidade inválida." });
    }
    if (!Number.isFinite(fileSizeBytes) || fileSizeBytes <= 0) {
      return json(400, { ok: false, message: "Arquivo inválido." });
    }

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

    // Load integration
    const { data: integ, error: integErr } = await service
      .from("user_video_integrations")
      .select("status,refresh_token_enc,refresh_token_iv,access_token,access_token_expires_at")
      .eq("tenant_id", tenantId)
      .eq("user_id", userId)
      .eq("provider", "youtube")
      .maybeSingle();

    if (integErr) {
      console.error(`[${functionName}] failed to load integration`, { error: integErr.message });
      return json(500, { ok: false, message: "Erro ao carregar integração." });
    }

    if (!integ || integ.status !== "connected") {
      return json(403, { ok: false, message: "Conecte sua conta do YouTube." });
    }

    // Ensure access token
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
        // mark revoked (best-effort)
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

    // Create DB record
    const { data: tv, error: tvErr } = await service
      .from("trail_videos")
      .insert({
        tenant_id: tenantId,
        user_id: userId,
        title,
        description: description || null,
        privacy: privacyStatus,
        file_name: fileName,
        status: "uploading",
      })
      .select("id")
      .single();

    if (tvErr || !tv?.id) {
      console.error(`[${functionName}] failed to create trail_videos`, { error: tvErr?.message });
      return json(500, { ok: false, message: "Não foi possível iniciar a publicação." });
    }

    // YouTube resumable upload initiation
    const metadata = {
      snippet: {
        title,
        description,
        categoryId: "27", // Education
      },
      status: {
        privacyStatus,
      },
    };

    const initRes = await fetch(
      "https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json; charset=UTF-8",
          "X-Upload-Content-Length": String(fileSizeBytes),
          "X-Upload-Content-Type": contentType,
        },
        body: JSON.stringify(metadata),
      },
    );

    if (!initRes.ok) {
      const errText = await initRes.text().catch(() => "");
      const errJson = tryParseJson(errText);
      const errMsg = String(errJson?.error?.message ?? "").trim();

      console.error(`[${functionName}] resumable init failed`, { status: initRes.status, errText });

      const friendly = errMsg.includes("YouTube Data API v3 has not been used")
        ? {
            message:
              "O projeto do Google usado por este login ainda está sem a YouTube Data API v3 habilitada (ou a alteração ainda não propagou).",
            details: errMsg,
            hint:
              "Confirme que você habilitou a API no MESMO projeto do OAuth Client ID configurado no app. Tente novamente após alguns minutos e reconecte o YouTube.",
          }
        : {
            message: "Falha ao criar sessão de upload no YouTube.",
            details: errMsg || errText || null,
          };

      await service
        .from("trail_videos")
        .update({ status: "error", error_message: `init_failed:${initRes.status}` })
        .eq("id", tv.id);

      return json(initRes.status, {
        ok: false,
        error: "youtube_init_failed",
        ...friendly,
      });
    }

    const uploadUrl = initRes.headers.get("Location");
    if (!uploadUrl) {
      console.error(`[${functionName}] missing upload Location header`);
      await service.from("trail_videos").update({ status: "error", error_message: "missing_upload_url" }).eq("id", tv.id);
      return json(500, { ok: false, message: "Não foi possível obter URL de upload." });
    }

    return json(200, {
      ok: true,
      uploadUrl,
      trailVideoId: tv.id,
      // Client will PUT directly to uploadUrl, then call finalize
    });
  } catch (error) {
    console.error(`[${functionName}] unexpected`, { error: String(error) });
    return json(500, { ok: false, message: "Erro inesperado." });
  }
});