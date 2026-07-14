import { IMAGE_KEY_PATTERN, isImageMetadata, type ImageMetadata } from "../../_lib/images";

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
  }

  const key = new URL(request.url).pathname.slice(1);
  if (!IMAGE_KEY_PATTERN.test(key)) return new Response("Not Found", { status: 404 });

  const result = await env.IMAGES_KV.getWithMetadata<ImageMetadata>(key, { type: "stream", cacheTtl: 60 });
  if (result.value === null || !isImageMetadata(result.metadata)) return new Response("Not Found", { status: 404 });

  const headers = new Headers({
    "Content-Type": result.metadata.contentType,
    "Content-Length": String(result.metadata.size),
    "Content-Disposition": "inline",
    "Cache-Control": "public, max-age=31536000, immutable",
    "X-Content-Type-Options": "nosniff",
    "Cross-Origin-Resource-Policy": "cross-origin",
    "Access-Control-Allow-Origin": "*",
  });
  return new Response(request.method === "HEAD" ? null : result.value, { headers });
};
