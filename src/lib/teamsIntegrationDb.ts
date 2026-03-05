import { supabase } from "@/integrations/supabase/client";

export type TeamsIntegrationStatus = "connected" | "disconnected" | "revoked";

export type DbUserVideoIntegration = {
  id: string;
  tenant_id: string;
  user_id: string;
  provider: "teams";
  status: TeamsIntegrationStatus;
  created_at: string;
  updated_at: string;
  revoked_at: string | null;
};

export type TeamsVideo = {
  id: string;
  title: string;
  date: string | null;
  duration: number | null;
  embedUrl: string | null;
  originalUrl: string | null;
};

export class EdgeFunctionError extends Error {
  status?: number;
  details?: string;
  constructor(message: string, opts?: { status?: number; details?: string }) {
    super(message);
    this.name = "EdgeFunctionError";
    this.status = opts?.status;
    this.details = opts?.details;
  }
}

const baseSelect = "id,tenant_id,user_id,provider,status,created_at,updated_at,revoked_at";

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

export async function getMyTeamsIntegration(tenantId: string, userId: string) {
  const { data, error } = await supabase
    .from("user_video_integrations")
    .select(baseSelect)
    .eq("tenant_id", tenantId)
    .eq("user_id", userId)
    .eq("provider", "teams")
    .maybeSingle();

  if (error) throw error;
  return (data ?? null) as DbUserVideoIntegration | null;
}

export async function disconnectTeams() {
  const { data, error } = await invokeAuthed<{ ok: boolean; error?: string; details?: string }>("teams-disconnect", {});

  if (error) {
    const parsed = await parseEdgeError(error);
    throw new EdgeFunctionError("Falha ao desconectar", { status: parsed.status, details: parsed.parsed?.details ?? parsed.details });
  }

  if (!data?.ok) {
    throw new EdgeFunctionError("Não foi possível desconectar", { details: String((data as any)?.details ?? (data as any)?.error ?? "") });
  }

  return data as { ok: true };
}

export async function startTeamsConnect(redirectTo: string) {
  const { data, error } = await invokeAuthed<{ ok: boolean; authUrl?: string; error?: string; details?: string }>(
    "teams-connect",
    { redirectTo },
  );

  if (error) {
    const parsed = await parseEdgeError(error);
    const serverDetails = parsed.parsed?.details ?? parsed.details;
    const serverError = parsed.parsed?.error;
    throw new EdgeFunctionError("Falha ao conectar Microsoft Teams", {
      status: parsed.status,
      details: serverError ? `${serverError}: ${serverDetails ?? ""}` : serverDetails,
    });
  }

  // teams-connect is "plug-and-play": when it's not configured, it returns HTTP 200 + ok:false.
  // Treat this as a user-facing error so the UI can open the setup modal.
  if (!data?.ok) {
    throw new EdgeFunctionError("Microsoft Teams não configurado", {
      status: 200,
      details: String((data as any)?.details ?? (data as any)?.error ?? "Conexão não configurada."),
    });
  }

  if (!data?.authUrl) {
    throw new EdgeFunctionError("Não foi possível iniciar conexão.", {
      details: "Resposta inválida.",
    });
  }

  return data as { ok: true; authUrl: string };
}

export async function listTeamsVideos(): Promise<TeamsVideo[]> {
  const { data, error } = await invokeAuthed<{ ok: boolean; videos?: TeamsVideo[]; error?: string; details?: string }>(
    "teams-list-videos",
    {},
  );

  if (error) {
    const parsed = await parseEdgeError(error);
    const serverDetails = parsed.parsed?.details ?? parsed.details;
    const serverError = parsed.parsed?.error;
    throw new EdgeFunctionError("Falha ao listar vídeos do Teams", {
      status: parsed.status,
      details: serverError ? `${serverError}: ${serverDetails ?? ""}` : serverDetails,
    });
  }

  if (!data?.ok) {
    throw new EdgeFunctionError("Não foi possível listar vídeos", {
      details: String((data as any)?.details ?? (data as any)?.error ?? ""),
    });
  }

  return data.videos ?? [];
}

export async function getTeamsHealth() {
  const { data, error } = await supabase.functions.invoke<{ ok: boolean; missing?: string[]; configured?: Record<string, boolean>; redirectUri?: string; tenantId?: string }>("teams-health");

  if (error) {
    console.error("Failed to check Teams health:", error);
    return { ok: false, missing: [], configured: {}, redirectUri: "", tenantId: null };
  }

  return {
    ok: data?.ok ?? false,
    missing: data?.missing ?? [],
    configured: data?.configured ?? {},
    redirectUri: data?.redirectUri ?? "",
    tenantId: data?.tenantId ?? null,
  };
}