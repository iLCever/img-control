import { IMAGE_KEY_PATTERN } from "./_lib/images";
import { landingResponse } from "./_lib/landing";

const IMAGE_HOST = "img.moxiao.ggff.net";

export const onRequest: PagesFunction<Env> = async ({ request, next }) => {
  const url = new URL(request.url);
  if (url.hostname !== IMAGE_HOST) return next();

  // 图片域名只暴露入口页、robots.txt 和合法图片路径，管理 API 仅能从后台域名访问。
  if (url.pathname === "/" && (request.method === "GET" || request.method === "HEAD")) {
    return landingResponse(request.method === "HEAD");
  }
  if (url.pathname === "/robots.txt" && request.method === "GET") return next();
  if ((request.method === "GET" || request.method === "HEAD") && IMAGE_KEY_PATTERN.test(url.pathname.slice(1))) {
    return next();
  }
  return new Response("Not Found", {
    status: 404,
    headers: { "Content-Type": "text/plain; charset=utf-8", "X-Content-Type-Options": "nosniff" },
  });
};
