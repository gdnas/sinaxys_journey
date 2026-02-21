export function bytesToBase64Url(bytes: Uint8Array) {
  // btoa expects binary string
  let bin = "";
  for (let i = 0; i < bytes.length; i++) bin += String.fromCharCode(bytes[i]);
  const b64 = btoa(bin);
  return b64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

export function base64UrlToBytes(b64url: string) {
  const b64 = b64url.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64url.length + 3) % 4);
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function stringToBase64Url(s: string) {
  return bytesToBase64Url(new TextEncoder().encode(s));
}

export function base64UrlToString(b64url: string) {
  return new TextDecoder().decode(base64UrlToBytes(b64url));
}
