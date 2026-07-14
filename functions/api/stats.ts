import { listAllImages } from "../_lib/images";
import { jsonError, jsonSuccess, logError } from "../_lib/http";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  try {
    // 公开页需要展示图片数量和占用空间，因此统计接口为只读公开接口。
    if (!env.PUBLIC_IMAGE_BASE_URL) return jsonError("SERVER_MISCONFIGURED", "图片访问域名尚未配置", 500);
    const images = await listAllImages(env.IMAGES_KV, env.PUBLIC_IMAGE_BASE_URL);
    const count = images.length;
    const totalSize = images.reduce((sum, image) => sum + image.size, 0);

    return jsonSuccess({ count, totalSize });
  } catch (error) {
    logError(request, error);
    return jsonError("STATS_FAILED", "存储统计加载失败", 500);
  }
};
