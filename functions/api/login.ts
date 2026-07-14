import { createSessionCookie, timingSafeTextEqual } from "../_lib/auth";
import { isSameOrigin, jsonError, jsonSuccess, logError } from "../_lib/http";
import { clearLoginFailures, isLoginBlocked, recordLoginFailure } from "../_lib/rateLimit";

interface LoginBody {
  password: string;
}

function isLoginBody(value: unknown): value is LoginBody {
  return typeof value === "object" && value !== null && "password" in value
    && typeof value.password === "string" && value.password.length <= 1024;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    if (!isSameOrigin(request)) return jsonError("INVALID_ORIGIN", "请求来源无效", 403);
    if (!env.ADMIN_PASSWORD || !env.SESSION_SECRET) return jsonError("SERVER_MISCONFIGURED", "服务端 Secret 尚未配置", 500);
    if (await isLoginBlocked(request)) {
      return jsonError("TOO_MANY_ATTEMPTS", "登录失败次数过多，请 15 分钟后重试", 429, { "Retry-After": "900" });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return jsonError("INVALID_JSON", "请求体必须是有效 JSON", 400);
    }
    if (!isLoginBody(body) || body.password.length === 0) return jsonError("INVALID_PASSWORD", "请输入管理员密码", 400);

    if (!(await timingSafeTextEqual(body.password, env.ADMIN_PASSWORD))) {
      await recordLoginFailure(request);
      return jsonError("INVALID_CREDENTIALS", "管理员密码错误", 401);
    }

    await clearLoginFailures(request);
    return jsonSuccess({ authenticated: true }, 200, { "Set-Cookie": await createSessionCookie(env.SESSION_SECRET) });
  } catch (error) {
    logError(request, error);
    return jsonError("INTERNAL_ERROR", "登录服务暂时不可用", 500);
  }
};
