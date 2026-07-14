import { requireSession } from "../_lib/auth";
import { decodeCursor, encodeCursor, IMAGE_KEY_PATTERN, listAllImages } from "../_lib/images";
import { isSameOrigin, jsonError, jsonSuccess, logError } from "../_lib/http";

interface DeleteBody {
  keys: string[];
}

function parseDeleteBody(value: unknown): DeleteBody | null {
  if (typeof value !== "object" || value === null || !("keys" in value) || !Array.isArray(value.keys)) return null;
  if (value.keys.length < 1 || value.keys.length > 100 || !value.keys.every((key) => typeof key === "string")) return null;
  return { keys: [...new Set(value.keys)] };
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const unauthorized = await requireSession(request, env);
    if (unauthorized) return unauthorized;
    if (!env.PUBLIC_IMAGE_BASE_URL) return jsonError("SERVER_MISCONFIGURED", "图片访问域名尚未配置", 500);

    const url = new URL(request.url);
    const limitText = url.searchParams.get("limit") ?? "30";
    if (!/^\d{1,3}$/u.test(limitText)) return jsonError("INVALID_LIMIT", "limit 必须是 1 至 100 的整数", 400);
    const limit = Number(limitText);
    if (limit < 1 || limit > 100) return jsonError("INVALID_LIMIT", "limit 必须是 1 至 100 的整数", 400);
    const offset = decodeCursor(url.searchParams.get("cursor"));
    if (offset === null) return jsonError("INVALID_CURSOR", "分页 cursor 无效", 400);
    const search = (url.searchParams.get("search") ?? "").trim().slice(0, 200).toLocaleLowerCase();

    const allImages = await listAllImages(env.IMAGES_KV, env.PUBLIC_IMAGE_BASE_URL);
    const filtered = search
      ? allImages.filter((image) => image.key.toLocaleLowerCase().includes(search) || image.originalName.toLocaleLowerCase().includes(search))
      : allImages;
    const images = filtered.slice(offset, offset + limit);
    const nextOffset = offset + images.length;
    return jsonSuccess({
      images,
      nextCursor: nextOffset < filtered.length ? encodeCursor(nextOffset) : null,
      matchedCount: filtered.length,
    });
  } catch (error) {
    logError(request, error);
    return jsonError("LIST_FAILED", "图片列表加载失败", 500);
  }
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  try {
    const unauthorized = await requireSession(request, env);
    if (unauthorized) return unauthorized;
    if (!isSameOrigin(request)) return jsonError("INVALID_ORIGIN", "请求来源无效", 403);

    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return jsonError("INVALID_JSON", "请求体必须是有效 JSON", 400);
    }
    const body = parseDeleteBody(rawBody);
    if (!body) return jsonError("INVALID_KEYS", "keys 必须包含 1 至 100 个图片 Key", 400);
    if (body.keys.some((key) => !IMAGE_KEY_PATTERN.test(key))) {
      return jsonError("INVALID_KEY", "包含不合法的图片 Key", 400);
    }

    // 先确认对象确实存在于当前 Namespace，避免把任意字符串直接传给删除操作。
    const existing = await Promise.all(body.keys.map((key) => env.IMAGES_KV.get(key, "stream")));
    if (existing.some((value) => value === null)) return jsonError("IMAGE_NOT_FOUND", "部分图片不存在，请刷新列表后重试", 404);
    await Promise.all(body.keys.map((key) => env.IMAGES_KV.delete(key)));
    return jsonSuccess({ deletedKeys: body.keys, deletedCount: body.keys.length });
  } catch (error) {
    logError(request, error);
    return jsonError("DELETE_FAILED", "删除图片失败，请稍后重试", 500);
  }
};
