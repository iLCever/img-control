import type { ApiResponse } from "./types";

const SECURITY_HEADERS: Record<string, string> = {
  "Cache-Control": "no-store",
  "Content-Type": "application/json; charset=utf-8",
  "X-Content-Type-Options": "nosniff",
  "X-Frame-Options": "DENY",
  "Referrer-Policy": "no-referrer",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "Content-Security-Policy": "default-src 'none'; frame-ancestors 'none'",
};

export function jsonSuccess<T>(data: T, status = 200, extraHeaders?: HeadersInit): Response {
  const body: ApiResponse<T> = { success: true, data, error: null };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...SECURITY_HEADERS, ...Object.fromEntries(new Headers(extraHeaders)) },
  });
}

export function jsonError(code: string, message: string, status = 400, extraHeaders?: HeadersInit): Response {
  const body: ApiResponse<never> = { success: false, data: null, error: { code, message } };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...SECURITY_HEADERS, ...Object.fromEntries(new Headers(extraHeaders)) },
  });
}

export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("Origin");
  return origin !== null && origin === new URL(request.url).origin;
}

export function logError(request: Request, error: unknown): void {
  // 日志只记录路径与错误消息，绝不记录 Cookie、密码或请求体。
  console.error(JSON.stringify({
    message: "api_request_failed",
    path: new URL(request.url).pathname,
    error: error instanceof Error ? error.message : "Unknown error",
  }));
}
