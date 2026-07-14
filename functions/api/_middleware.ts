import { jsonError } from "../_lib/http";

const ALLOWED_METHODS: Record<string, readonly string[]> = {
  "/api/login": ["POST"],
  "/api/logout": ["POST"],
  "/api/session": ["GET"],
  "/api/upload": ["POST"],
  "/api/images": ["GET", "DELETE"],
  "/api/stats": ["GET"],
};

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  const path = new URL(request.url).pathname.replace(/\/+$/u, "") || "/";
  const allowed = ALLOWED_METHODS[path];
  if (!allowed) return jsonError("API_NOT_FOUND", "接口不存在", 404);
  if (!allowed.includes(request.method)) {
    return jsonError("METHOD_NOT_ALLOWED", "请求方法不受支持", 405, { Allow: allowed.join(", ") });
  }
  return next();
};
