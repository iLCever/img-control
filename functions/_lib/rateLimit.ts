const WINDOW_SECONDS = 15 * 60;
const MAX_FAILURES = 5;
const encoder = new TextEncoder();

interface RateState {
  count: number;
}

async function getRateKey(request: Request): Promise<Request> {
  const ip = request.headers.get("CF-Connecting-IP") ?? "unknown";
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(ip));
  const hash = Array.from(new Uint8Array(digest)).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return new Request(`https://login-rate-limit.invalid/${hash}`, { method: "GET" });
}

export async function isLoginBlocked(request: Request): Promise<boolean> {
  const cached = await caches.default.match(await getRateKey(request));
  if (!cached) return false;
  try {
    const state: unknown = await cached.json();
    return typeof state === "object" && state !== null && "count" in state
      && typeof state.count === "number" && state.count >= MAX_FAILURES;
  } catch {
    return false;
  }
}

export async function recordLoginFailure(request: Request): Promise<void> {
  const key = await getRateKey(request);
  const cached = await caches.default.match(key);
  let count = 0;
  if (cached) {
    try {
      const state: unknown = await cached.json();
      if (typeof state === "object" && state !== null && "count" in state && typeof state.count === "number") {
        count = state.count;
      }
    } catch {
      count = 0;
    }
  }
  const state: RateState = { count: count + 1 };
  await caches.default.put(key, new Response(JSON.stringify(state), {
    headers: { "Cache-Control": `public, max-age=${WINDOW_SECONDS}`, "Content-Type": "application/json" },
  }));
}

export async function clearLoginFailures(request: Request): Promise<void> {
  await caches.default.delete(await getRateKey(request));
}
