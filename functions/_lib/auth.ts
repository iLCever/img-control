import { jsonError } from "./http";

const COOKIE_NAME = "pic_session";
const SESSION_TTL_SECONDS = 7 * 24 * 60 * 60;
const encoder = new TextEncoder();

interface SessionPayload {
  exp: number;
  nonce: string;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

function base64UrlToBytes(value: string): Uint8Array | null {
  try {
    const normalized = value.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const binary = atob(padded);
    return Uint8Array.from(binary, (char) => char.charCodeAt(0));
  } catch {
    return null;
  }
}

async function importHmacKey(secret: string): Promise<CryptoKey> {
  return crypto.subtle.importKey("raw", encoder.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}

export async function timingSafeTextEqual(provided: string, expected: string): Promise<boolean> {
  const [left, right] = await Promise.all([
    crypto.subtle.digest("SHA-256", encoder.encode(provided)),
    crypto.subtle.digest("SHA-256", encoder.encode(expected)),
  ]);
  return crypto.subtle.timingSafeEqual(left, right);
}

export async function createSessionCookie(secret: string): Promise<string> {
  const payload: SessionPayload = {
    exp: Math.floor(Date.now() / 1000) + SESSION_TTL_SECONDS,
    nonce: crypto.randomUUID(),
  };
  const encodedPayload = bytesToBase64Url(encoder.encode(JSON.stringify(payload)));
  const signature = await crypto.subtle.sign("HMAC", await importHmacKey(secret), encoder.encode(encodedPayload));
  const token = `${encodedPayload}.${bytesToBase64Url(new Uint8Array(signature))}`;
  return `${COOKIE_NAME}=${token}; Path=/; Max-Age=${SESSION_TTL_SECONDS}; HttpOnly; Secure; SameSite=Strict`;
}

export function clearSessionCookie(): string {
  return `${COOKIE_NAME}=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict`;
}

function readCookie(request: Request, name: string): string | null {
  const cookieHeader = request.headers.get("Cookie");
  if (!cookieHeader) return null;
  for (const item of cookieHeader.split(";")) {
    const separator = item.indexOf("=");
    if (separator < 0) continue;
    if (item.slice(0, separator).trim() === name) return item.slice(separator + 1).trim();
  }
  return null;
}

export async function hasValidSession(request: Request, secret: string): Promise<boolean> {
  if (!secret) return false;
  const token = readCookie(request, COOKIE_NAME);
  if (!token) return false;
  const parts = token.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) return false;

  const signature = base64UrlToBytes(parts[1]);
  const payloadBytes = base64UrlToBytes(parts[0]);
  if (!signature || !payloadBytes) return false;

  const validSignature = await crypto.subtle.verify(
    "HMAC",
    await importHmacKey(secret),
    signature,
    encoder.encode(parts[0]),
  );
  if (!validSignature) return false;

  try {
    const payload: unknown = JSON.parse(new TextDecoder().decode(payloadBytes));
    return typeof payload === "object" && payload !== null && "exp" in payload
      && typeof payload.exp === "number" && payload.exp > Math.floor(Date.now() / 1000);
  } catch {
    return false;
  }
}

export async function requireSession(request: Request, env: Env): Promise<Response | null> {
  if (!env.SESSION_SECRET || !(await hasValidSession(request, env.SESSION_SECRET))) {
    return jsonError("UNAUTHORIZED", "请先登录", 401);
  }
  return null;
}
