import { hasValidSession } from "../_lib/auth";
import { jsonSuccess } from "../_lib/http";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const authenticated = Boolean(env.SESSION_SECRET) && await hasValidSession(request, env.SESSION_SECRET);
  return jsonSuccess({ authenticated });
};
