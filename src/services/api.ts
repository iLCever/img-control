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
  upload: (file: File) => {
    const form = new FormData();
    form.append("file", file);
    return apiRequest<ImageItem>("/api/upload", { method: "POST", body: form });
  },
  deleteImages: (keys: string[]) => apiRequest<{ deletedKeys: string[]; deletedCount: number }>("/api/images", {
    method: "DELETE",
    body: JSON.stringify({ keys }),
  }),
};
