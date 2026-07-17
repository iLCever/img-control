import type { ImageItem } from "./types";

export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const IMAGE_KEY_PATTERN = /^\d{4}\/(?:0[1-9]|1[0-2])\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp|gif|avif)$/iu;

interface ImageType {
  extension: "jpg" | "png" | "webp" | "gif" | "avif";
  contentType: "image/jpeg" | "image/png" | "image/webp" | "image/gif" | "image/avif";
}

export interface ImageMetadata {
  size: number;
  contentType: string;
  uploadedAt: string;
  originalName: string;
}

const EXTENSION_TYPES: Record<string, ImageType> = {
  jpg: { extension: "jpg", contentType: "image/jpeg" },
  jpeg: { extension: "jpg", contentType: "image/jpeg" },
  png: { extension: "png", contentType: "image/png" },
  webp: { extension: "webp", contentType: "image/webp" },
  gif: { extension: "gif", contentType: "image/gif" },
  avif: { extension: "avif", contentType: "image/avif" },
};

function ascii(bytes: Uint8Array, start: number, length: number): string {
  return String.fromCharCode(...bytes.slice(start, start + length));
}

function sniffImageType(bytes: Uint8Array): ImageType | null {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return EXTENSION_TYPES.jpg ?? null;
  if (bytes.length >= 8 && [137, 80, 78, 71, 13, 10, 26, 10].every((value, index) => bytes[index] === value)) return EXTENSION_TYPES.png ?? null;
  if (bytes.length >= 12 && ascii(bytes, 0, 4) === "RIFF" && ascii(bytes, 8, 4) === "WEBP") return EXTENSION_TYPES.webp ?? null;
  if (bytes.length >= 6 && (ascii(bytes, 0, 6) === "GIF87a" || ascii(bytes, 0, 6) === "GIF89a")) return EXTENSION_TYPES.gif ?? null;
  if (bytes.length >= 16 && ascii(bytes, 4, 4) === "ftyp") {
    // AVIF 可能把 avif/avis 放在 major brand 或 compatible brands 中。
    for (let offset = 8; offset + 4 <= bytes.length; offset += 4) {
      if (["avif", "avis"].includes(ascii(bytes, offset, 4))) return EXTENSION_TYPES.avif ?? null;
    }
  }
  return null;
}

export async function validateImage(file: File): Promise<{ type: ImageType; bytes: ArrayBuffer } | { error: string }> {
  if (file.size <= 0) return { error: "图片内容为空" };
  if (file.size > MAX_FILE_SIZE) return { error: "单张图片不能超过 5 MB" };
  const originalExtension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const extensionType = EXTENSION_TYPES[originalExtension];
  if (!extensionType) return { error: "仅允许 JPEG、PNG、WebP、GIF 和 AVIF 图片" };
  const contentTypeAllowed = Object.values(EXTENSION_TYPES).some((type) => type.contentType === file.type);
  if (!contentTypeAllowed) return { error: "图片 Content-Type 不受支持" };

  const bytes = await file.arrayBuffer();
  const detected = sniffImageType(new Uint8Array(bytes.slice(0, 64)));
  if (!detected) return { error: "文件头校验失败，文件可能不是有效图片" };

  // 某些看图或导出软件只修改文件后缀，二进制内容仍是另一种允许的图片格式。
  // 文件头比扩展名和浏览器提供的 Content-Type 更可靠，因此按检测结果生成 Key 和响应类型。
  return { type: detected, bytes };
}

export function buildImageKey(extension: ImageType["extension"], now = new Date()): string {
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  return `${year}/${month}/${crypto.randomUUID()}.${extension}`;
}

export function safeOriginalName(name: string): string {
  // 原始名称只作为搜索元数据；移除路径、控制字符并限制长度。
  return name.split(/[\\/]/u).pop()?.replace(/[\u0000-\u001f\u007f]/gu, "").slice(0, 200) || "image";
}

export function publicImageUrl(baseUrl: string, key: string): string {
  return `${baseUrl.replace(/\/+$/u, "")}/${key.split("/").map(encodeURIComponent).join("/")}`;
}

export function isImageMetadata(value: unknown): value is ImageMetadata {
  return typeof value === "object" && value !== null
    && "size" in value && typeof value.size === "number" && value.size >= 0
    && "contentType" in value && typeof value.contentType === "string"
    && "uploadedAt" in value && typeof value.uploadedAt === "string"
    && "originalName" in value && typeof value.originalName === "string";
}

export async function listAllImages(namespace: KVNamespace, baseUrl: string): Promise<ImageItem[]> {
  const images: ImageItem[] = [];
  let cursor: string | undefined;
  do {
    const page = await namespace.list<ImageMetadata>({ limit: 1000, cursor });
    for (const item of page.keys) {
      if (!IMAGE_KEY_PATTERN.test(item.name) || !isImageMetadata(item.metadata)) continue;
      images.push({
        key: item.name,
        url: publicImageUrl(baseUrl, item.name),
        size: item.metadata.size,
        contentType: item.metadata.contentType,
        uploadedAt: item.metadata.uploadedAt,
        originalName: item.metadata.originalName,
      });
    }
    cursor = page.list_complete ? undefined : page.cursor;
  } while (cursor);
  return images.sort((a, b) => b.uploadedAt.localeCompare(a.uploadedAt));
}

export function encodeCursor(offset: number): string {
  return btoa(String(offset)).replaceAll("+", "-").replaceAll("/", "_").replace(/=+$/u, "");
}

export function decodeCursor(cursor: string | null): number | null {
  if (!cursor) return 0;
  try {
    const normalized = cursor.replaceAll("-", "+").replaceAll("_", "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    const offset = Number.parseInt(atob(padded), 10);
    return Number.isSafeInteger(offset) && offset >= 0 ? offset : null;
  } catch {
    return null;
  }
}
