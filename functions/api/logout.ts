import { clearSessionCookie } from "../_lib/auth";
import { isSameOrigin, jsonError, jsonSuccess } from "../_lib/http";

export const onRequestPost: PagesFunction<Env> = async ({ request }) => {
  if (!isSameOrigin(request)) return jsonError("INVALID_ORIGIN", "请求来源无效", 403);
  return jsonSuccess({ authenticated: false }, 200, { "Set-Cookie": clearSessionCookie() });
};
