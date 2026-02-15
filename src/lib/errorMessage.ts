export function getErrorMessage(e: unknown): string {
  if (!e) return "Erro inesperado.";
  if (typeof e === "string") return e;
  if (e instanceof Error) return e.message;

  const anyE = e as any;
  const message = typeof anyE?.message === "string" ? anyE.message : null;
  const details = typeof anyE?.details === "string" ? anyE.details : null;
  const hint = typeof anyE?.hint === "string" ? anyE.hint : null;
  const code = typeof anyE?.code === "string" ? anyE.code : null;

  const parts = [message, details, hint, code ? `Código: ${code}` : null].filter(Boolean) as string[];
  if (parts.length) return parts.join(" • ");

  try {
    return JSON.stringify(anyE);
  } catch {
    return "Erro inesperado.";
  }
}
