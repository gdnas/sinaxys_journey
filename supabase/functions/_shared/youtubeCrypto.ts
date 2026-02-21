import { base64UrlToBytes, bytesToBase64Url } from "./base64url.ts";

function base64ToBytes(b64: string) {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function bytesToBase64(bytes: Uint8Array) {
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  return btoa(bin);
}

async function importAesKey(keyB64: string) {
  const raw = base64ToBytes(keyB64);
  if (raw.length !== 32) {
    throw new Error("YOUTUBE_TOKEN_ENC_KEY deve ser base64 de 32 bytes (AES-256).");
  }
  return await crypto.subtle.importKey("raw", raw, { name: "AES-GCM" }, false, ["encrypt", "decrypt"]);
}

export async function encryptToken(plain: string, keyB64: string) {
  const key = await importAesKey(keyB64);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plain));
  return {
    cipherTextB64: bytesToBase64(new Uint8Array(ciphertext)),
    ivB64: bytesToBase64(iv),
  };
}

export async function decryptToken(cipherTextB64: string, ivB64: string, keyB64: string) {
  const key = await importAesKey(keyB64);
  const iv = base64ToBytes(ivB64);
  const ciphertext = base64ToBytes(cipherTextB64);
  const plainBuf = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, ciphertext);
  return new TextDecoder().decode(new Uint8Array(plainBuf));
}
