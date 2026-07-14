import type { ApiResponse, ImageItem, ImageListData, StatsData } from "../types";

export class ApiRequestError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ApiRequestError";
  }
}

async function apiRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    ...init,
    credentials: "same-origin",
    headers: {
      ...(init?.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...init?.headers,
    },
  });

  let payload: ApiResponse<T>;
  try {
    payload = await response.json() as ApiResponse<T>;
  } catch {
    throw new ApiRequestError("服务器返回了无法解析的响应", "INVALID_RESPONSE", response.status);
  }
  if (!response.ok || !payload.success || payload.data === null) {
    throw new ApiRequestError(payload.error?.message ?? "请求失败", payload.error?.code ?? "REQUEST_FAILED", response.status);
  }
  return payload.data;
}

function uploadImage(file: File, onProgress: (progress: number) => void): Promise<ImageItem> {
  return new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open("POST", "/api/upload");
    request.withCredentials = true;

    // Fetch 暂不提供可靠的上传进度事件，使用 XHR 获取浏览器实际发送字节数。
    request.upload.addEventListener("progress", (event) => {
      if (event.lengthComputable && event.total > 0) {
        onProgress(Math.min(100, Math.round((event.loaded / event.total) * 100)));
      }
    });
    request.addEventListener("error", () => {
      reject(new ApiRequestError("网络连接失败，请稍后重试", "NETWORK_ERROR", 0));
    });
    request.addEventListener("load", () => {
      let payload: ApiResponse<ImageItem>;
      try {
        payload = JSON.parse(request.responseText) as ApiResponse<ImageItem>;
      } catch {
        reject(new ApiRequestError("服务器返回了无法解析的响应", "INVALID_RESPONSE", request.status));
        return;
      }
      if (request.status < 200 || request.status >= 300 || !payload.success || payload.data === null) {
        reject(new ApiRequestError(payload.error?.message ?? "上传失败", payload.error?.code ?? "UPLOAD_FAILED", request.status));
        return;
      }
      onProgress(100);
      resolve(payload.data);
    });

    const form = new FormData();
    form.append("file", file);
    request.send(form);
  });
}

export const api = {
  session: () => apiRequest<{ authenticated: boolean }>("/api/session", { method: "GET" }),
  login: (password: string) => apiRequest<{ authenticated: boolean }>("/api/login", {
    method: "POST",
    body: JSON.stringify({ password }),
  }),
  logout: () => apiRequest<{ authenticated: boolean }>("/api/logout", { method: "POST", body: "{}" }),
  listImages: (cursor: string | null, search: string) => {
    const params = new URLSearchParams({ limit: "30" });
    if (cursor) params.set("cursor", cursor);
    if (search) params.set("search", search);
    return apiRequest<ImageListData>(`/api/images?${params.toString()}`, { method: "GET" });
  },
  stats: () => apiRequest<StatsData>("/api/stats", { method: "GET" }),
  upload: uploadImage,
  deleteImages: (keys: string[]) => apiRequest<{ deletedKeys: string[]; deletedCount: number }>("/api/images", {
    method: "DELETE",
    body: JSON.stringify({ keys }),
  }),
};
