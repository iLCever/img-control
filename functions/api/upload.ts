import { requireSession } from "../_lib/auth";
import { buildImageKey, publicImageUrl, safeOriginalName, validateImage, type ImageMetadata } from "../_lib/images";
import { isSameOrigin, jsonError, jsonSuccess, logError } from "../_lib/http";

const PUBLIC_UPLOAD_HOST = "img.moxiao.ggff.net";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  try {
    // 公开图片域名允许匿名上传；管理域名调用上传接口时仍要求管理员 Session。
    if (new URL(request.url).hostname !== PUBLIC_UPLOAD_HOST) {
      const unauthorized = await requireSession(request, env);
      if (unauthorized) return unauthorized;
    }
    if (!isSameOrigin(request)) return jsonError("INVALID_ORIGIN", "请求来源无效", 403);
    if (!env.PUBLIC_IMAGE_BASE_URL) return jsonError("SERVER_MISCONFIGURED", "图片访问域名尚未配置", 500);

    const contentType = request.headers.get("Content-Type") ?? "";
    if (!contentType.toLowerCase().startsWith("multipart/form-data;")) {
      return jsonError("INVALID_CONTENT_TYPE", "上传请求必须使用 multipart/form-data", 415);
    }
    const contentLength = Number(request.headers.get("Content-Length") ?? "0");
    if (Number.isFinite(contentLength) && contentLength > 6 * 1024 * 1024) {
      return jsonError("REQUEST_TOO_LARGE", "上传请求过大，每次只能上传一张不超过 5 MB 的图片", 413);
    }

    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) return jsonError("FILE_REQUIRED", "请选择要上传的图片", 400);
    const fileParts = [...form.values()].filter((value) => value instanceof File);
    if (fileParts.length !== 1) return jsonError("ONE_FILE_PER_REQUEST", "每个请求只能上传一张图片", 400);

    const validation = await validateImage(file);
    if ("error" in validation) return jsonError("INVALID_IMAGE", validation.error, 400);

    const now = new Date();
    const key = buildImageKey(validation.type.extension, now);
    const originalName = safeOriginalName(file.name);
    const metadata: ImageMetadata = {
      size: file.size,
      contentType: validation.type.contentType,
      uploadedAt: now.toISOString(),
      originalName,
    };
    await env.IMAGES_KV.put(key, validation.bytes, { metadata });

    return jsonSuccess({
      url: publicImageUrl(env.PUBLIC_IMAGE_BASE_URL, key),
      key,
      size: file.size,
      contentType: validation.type.contentType,
      uploadedAt: now.toISOString(),
      originalName,
    }, 201);
  } catch (error) {
    logError(request, error);
    // KV 的单次 put 不会暴露部分值；多图由前端拆成独立请求。
    return jsonError("UPLOAD_FAILED", "图片上传失败，请稍后重试", 500);
  }
};
