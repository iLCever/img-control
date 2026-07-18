import { IMAGE_KEY_PATTERN } from "./_lib/images";

const IMAGE_HOST = "img.moxiao.ggff.net";
const REACHABLE_GET_API_PATHS = new Set(["/api/images", "/api/stats"]);

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  const url = new URL(request.url);
  if (url.hostname !== IMAGE_HOST) return next();

  // 图片域名允许列表请求进入 API 层并返回标准 401；统计、静态资源、上传和图片直链保持公开。
  if ((request.method === "GET" || request.method === "HEAD") && (
    url.pathname === "/" ||
    url.pathname === "/index.html" ||
    url.pathname === "/robots.txt" ||
    url.pathname === "/favicon.svg" ||
    url.pathname.startsWith("/assets/")
  )) return next();
  if (request.method === "GET" && REACHABLE_GET_API_PATHS.has(url.pathname)) return next();
  if (request.method === "POST" && url.pathname === "/api/upload") return next();
  if ((request.method === "GET" || request.method === "HEAD") && IMAGE_KEY_PATTERN.test(url.pathname.slice(1))) {
    return next();
  }
  return new Response("Not Found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" },
  });
};
