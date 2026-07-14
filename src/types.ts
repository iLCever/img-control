export interface ApiError {
  code: string;
  message: string;
}

export interface ApiResponse<T> {
  success: boolean;
  data: T | null;
  error: ApiError | null;
}

export interface ImageItem {
  key: string;
  url: string;
  size: number;
  contentType: string;
  uploadedAt: string;
  originalName: string;
}

export interface ImageListData {
  images: ImageItem[];
  nextCursor: string | null;
  matchedCount: number;
}

export interface StatsData {
  count: number;
  totalSize: number;
  visitorIp: string;
}

export type UploadStatus = "waiting" | "uploading" | "success" | "error";

export interface UploadTask {
  id: string;
  file: File;
  status: UploadStatus;
  progress: number;
  result?: ImageItem;
  error?: string;
}
