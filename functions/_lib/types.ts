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
