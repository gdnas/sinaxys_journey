import { base64UrlToBytes, base64UrlToString, bytesToBase64Url, stringToBase64Url } from "./base64url.ts";

export type TeamsOAuthStatePayload = {
  tenantId: string;
  userId: string;
  redirectTo: string;
  nonce: string;
  ts: number; // ms
};

async function hmacSign(secret: string, data: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data));
  return new Uint8Array(sig);
}

export async function signTeamsOAuthState(payload: TeamsOAuthStatePayload, secret: string) {
  const body = stringToBase64Url(JSON.stringify(payload));
  const sigBytes = await hmacSign(secret, body);
  const sig = bytesToBase64Url(sigBytes);
  return `${body}.${sig}`;
}

export async function verifyTeamsOAuthState(state: string, secret: string) {
  const [body, sig] = String(state ?? "").split(".");
  if (!body || !sig) return { ok: false as const, message: "state inválido" };

  const expected = await hmacSign(secret, body);
  const expectedB64 = bytesToBase64Url(expected);
  if (expectedB64 !== sig) return { ok: false as const, message: "state inválido" };

  let payload: TeamsOAuthStatePayload | null = null;
  try {
    payload = JSON.parse(base64UrlToString(body));
  } catch {
    payload = null;
  }

  if (!payload?.tenantId || !payload?.userId || !payload?.redirectTo || !payload?.nonce || !payload?.ts) {
    return { ok: false as const, message: "state inválido" };
  }

  // Expira rápido (15 min)
  const ageMs = Date.now() - Number(payload.ts);
  if (!Number.isFinite(ageMs) || ageMs < 0 || ageMs > 15 * 60 * 1000) {
    return { ok: false as const, message: "sessão expirada" };
  }

  return { ok: true as const, payload };
}