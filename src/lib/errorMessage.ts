export function getErrorMessage(e: unknown): string {
  if (!e) return "Erro inesperado.";
  if (typeof e === "string") return e;

  const anyE = e as any;

  // Common network issues (browser fetch)
  const rawMsg = typeof anyE?.message === "string" ? anyE.message : e instanceof Error ? e.message : null;
  if (rawMsg) {
    const m = rawMsg.toLowerCase();
    if (m.includes("failed to fetch") || m.includes("networkerror") || m.includes("load failed")) {
      return "Falha de rede ao conectar ao servidor. Tente novamente.";
    }
    if (m.includes("unauthorized") || m.includes("jwt") || m.includes("not authenticated")) {
      return "Sessão expirada ou sem permissão. Faça login novamente.";
    }
  }

  // Supabase / PostgREST style
  const message = typeof anyE?.message === "string" ? anyE.message : null;
  const details = typeof anyE?.details === "string" ? anyE.details : null;
  const hint = typeof anyE?.hint === "string" ? anyE.hint : null;
  const code = typeof anyE?.code === "string" ? anyE.code : null;

  // Supabase Edge Function error sometimes comes with context
  const status = typeof anyE?.context?.status === "number" ? anyE.context.status : typeof anyE?.status === "number" ? anyE.status : null;
  const statusText = status ? `HTTP ${status}` : null;

  const parts = [message, details, hint, statusText, code ? `Código: ${code}` : null].filter(Boolean) as string[];
  if (parts.length) {
    const joined = parts.join(" • ");

    const lower = joined.toLowerCase();
    if (lower.includes("unauthorized") || status === 401) {
      return "Sessão expirada ou sem permissão. Faça login novamente.";
    }
    if (status === 404) {
      return "Serviço não encontrado (HTTP 404).";
    }

    return joined;
  }

  if (e instanceof Error) return e.message;

  try {
    return JSON.stringify(anyE);
  } catch {
    return "Erro inesperado.";
  }
}